import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { hash } from "bcrypt";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import * as z from "zod";
import { sendEmail } from "@/lib/email";
import {
	fieldResponses,
	otpVerifications,
	registrations,
	users,
} from "../db/schema";
import { requireAdmin } from "../lib/auth";
import { safeParseAndThrow } from "../lib/utils";
import {
	getAlternateEmailFieldId,
	getAlternatePhoneFieldId,
	getFieldResponses,
	parseFieldResponses,
} from "./field";
import { getConfigHelper } from "./configuration";

export const submitRegistration = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as FormData)
	.handler(async ({ data: formData }) => {
		// Extract base fields
		const password = formData.get("password") as string;
		const email = formData.get("email") as string;
		const phone = formData.get("phone") as string;

		if (!password || !email || !phone) {
			throw new Error(
				"Missing required fields: username, password, email, or phone",
			);
		}

		const cleanEmail = email.trim().toLowerCase();
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(cleanEmail)) {
			throw new Error("Invalid email format");
		}

		// Validate phone number format (exactly 10 digits)
		const digits = phone.replace(/\D/g, "");
		const cleanPhone =
			digits.length === 12 && digits.startsWith("91")
				? digits.slice(2)
				: digits;
		if (cleanPhone.length !== 10) {
			throw new Error("Phone number must be exactly 10 digits");
		}

		// 1. Check if user already exists
		const [existingUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(ilike(users.username, cleanEmail))
			.limit(1);

		if (existingUser) {
			throw new Error("A user with this email already exists");
		}

		// Check if registration with this email already exists
		const [existingRegEmail] = await db
			.select({ id: registrations.id })
			.from(registrations)
			.where(
				and(
					ilike(registrations.email, cleanEmail),
					or(
						isNull(registrations.accepted),
						eq(registrations.accepted, true),
					),
				),
			)
			.limit(1);

		if (existingRegEmail) {
			throw new Error("A registration with this email already exists");
		}

		// Check if this primary email is already registered as an alternate email
		const altEmailFieldId = getAlternateEmailFieldId();
		if (altEmailFieldId !== null) {
			const [existingAltEmail] = await db
				.select({ id: fieldResponses.id })
				.from(fieldResponses)
				.innerJoin(
					registrations,
					eq(fieldResponses.entityId, registrations.id),
				)
				.where(
					and(
						eq(fieldResponses.entityType, "registration"),
						eq(fieldResponses.fieldId, altEmailFieldId),
						ilike(fieldResponses.value, cleanEmail),
						or(
							isNull(registrations.accepted),
							eq(registrations.accepted, true),
						),
					),
				)
				.limit(1);

			if (existingAltEmail) {
				throw new Error(
					"A registration with this email already exists as an alternate contact",
				);
			}
		}

		// Check if registration with this phone already exists
		const [existingRegPhone] = await db
			.select({ id: registrations.id })
			.from(registrations)
			.where(
				and(
					eq(registrations.phone, cleanPhone),
					or(
						isNull(registrations.accepted),
						eq(registrations.accepted, true),
					),
				),
			)
			.limit(1);

		if (existingRegPhone) {
			throw new Error(
				"A registration with this phone number already exists",
			);
		}

		// Check if this primary phone is already registered as an alternate phone
		const altPhoneFieldId = getAlternatePhoneFieldId();
		if (altPhoneFieldId !== null) {
			const altPhoneCondition =
				cleanPhone.length >= 10
					? or(
							sql`RIGHT(regexp_replace(${fieldResponses.value}, '[^0-9]', '', 'g'), 10) = ${cleanPhone.slice(-10)}`,
							eq(fieldResponses.value, cleanPhone),
							eq(fieldResponses.value, phone.trim()),
						)
					: eq(fieldResponses.value, phone.trim());

			const [existingAltPhone] = await db
				.select({ id: fieldResponses.id })
				.from(fieldResponses)
				.innerJoin(
					registrations,
					eq(fieldResponses.entityId, registrations.id),
				)
				.where(
					and(
						eq(fieldResponses.entityType, "registration"),
						eq(fieldResponses.fieldId, altPhoneFieldId),
						altPhoneCondition,
						or(
							isNull(registrations.accepted),
							eq(registrations.accepted, true),
						),
					),
				)
				.limit(1);

			if (existingAltPhone) {
				throw new Error(
					"A registration with this phone number already exists as an alternate contact",
				);
			}
		}

		// 2. Verify Email OTP
		const [emailVerification] = await db
			.select()
			.from(otpVerifications)
			.where(
				and(
					eq(otpVerifications.type, "email"),
					ilike(otpVerifications.target, cleanEmail),
					eq(otpVerifications.verified, true),
				),
			)
			.orderBy(desc(otpVerifications.createdAt))
			.limit(1);

		if (!emailVerification) {
			throw new Error("Email has not been verified with OTP");
		}

		// Hash password
		const hashedPassword = await hash(password, 10);

		let createdRegistrationId = 0;

		await db.transaction(async (tx) => {
			// Insert registration record
			const [registration] = await tx
				.insert(registrations)
				.values({
					password: hashedPassword,
					email: cleanEmail,
					phone: cleanPhone,
				})
				.returning({ id: registrations.id });

			createdRegistrationId = registration.id;

			// Parse form data using the shared helper (includes dynamic fields email/phone uniqueness validation)
			const fieldEntries = await parseFieldResponses(
				formData,
				"registration",
				undefined, // No specific entity ID for registration fields
				`registrations/${registration.id}`,
				{
					skipKeys: ["username", "password", "email", "phone"],
					stage: "initial",
					registrationId: registration.id,
				},
			);

			// Insert all field responses
			if (fieldEntries.length > 0) {
				await tx.insert(fieldResponses).values(
					fieldEntries.map((entry) => ({
						entityType: "registration" as const,
						entityId: registration.id,
						fieldId: entry.fieldId,
						value: entry.value,
						iteration: entry.iteration,
					})),
				);
			}
		});

		const config = await getConfigHelper();
		if (config?.officeEmail) {
			await sendEmail({
				to: config.officeEmail,
				subject: "New Registration",
				message: `A new registration (ID: ${createdRegistrationId}) has been submitted.`,
			});
		}

		return { success: true, registrationId: createdRegistrationId };
	});

export const getRegistrations = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin();

		// Get basic info for all registrations
		return await db
			.select({
				id: registrations.id,
				email: registrations.email,
				phone: registrations.phone,
				accepted: registrations.accepted,
				rejectionReason: registrations.rejectionReason,
			})
			.from(registrations)
			.orderBy(desc(registrations.id));
	},
);

const GetRegistrationInput = z.object({
	regId: z.number(),
});

export const getRegistration = createServerFn({ method: "GET" })
	.inputValidator(GetRegistrationInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, GetRegistrationInput);
		const regId = parsedData.regId;

		const [reg] = await db
			.select()
			.from(registrations)
			.where(eq(registrations.id, regId));

		if (!reg) {
			throw new Error("Registration not found");
		}

		const { password: _password, ...regData } = reg;
		const responses = await getFieldResponses("registration", reg.id);

		return {
			...regData,
			responses,
		};
	});

export const getRegistrationName = createServerOnlyFn(
	async (registrationId: number, configNameFieldId?: number | null) => {
		if (!configNameFieldId) return "User";
		const [nameResponse] = await db
			.select({ value: fieldResponses.value })
			.from(fieldResponses)
			.where(
				and(
					eq(fieldResponses.entityType, "registration"),
					eq(fieldResponses.entityId, registrationId),
					eq(fieldResponses.fieldId, configNameFieldId),
				),
			)
			.limit(1);
		return nameResponse?.value || "User";
	},
);

export const getRegistrationUserContext = createServerOnlyFn(
	async (registrationId: number, configNameFieldId?: number | null) => {
		const [reg] = await db
			.select()
			.from(registrations)
			.where(eq(registrations.id, registrationId))
			.limit(1);

		if (!reg) {
			return { userName: "User", userEmail: null };
		}

		const userName = await getRegistrationName(
			registrationId,
			configNameFieldId,
		);

		return {
			userName,
			userEmail: reg.email,
		};
	},
);

const AcceptRegistrationInput = z.object({
	regId: z.number(),
	categoryValue: z.string().min(1, "Category value is required"),
});

export const acceptRegistration = createServerFn({ method: "POST" })
	.inputValidator(AcceptRegistrationInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const { regId, categoryValue } = safeParseAndThrow(
			data,
			AcceptRegistrationInput,
		);

		const config = await getConfigHelper();
		if (!config || !config.registrationCategoryFieldId) {
			throw new Error("Category field is not configured in settings");
		}
		if (!config || !config.registrationNameFieldId) {
			throw new Error("Name field is not configured in settings");
		}
		const categoryFieldId = config.registrationCategoryFieldId;

		const [reg] = await db
			.select()
			.from(registrations)
			.where(eq(registrations.id, regId));

		if (!reg) {
			throw new Error("Registration not found");
		}

		if (reg.accepted === true) {
			throw new Error("Registration already accepted");
		}

		await db.transaction(async (tx) => {
			const [existingResponse] = await tx
				.select({ id: fieldResponses.id })
				.from(fieldResponses)
				.where(
					and(
						eq(fieldResponses.entityType, "registration"),
						eq(fieldResponses.entityId, reg.id),
						eq(fieldResponses.fieldId, categoryFieldId),
					),
				)
				.limit(1);

			if (existingResponse) {
				await tx
					.update(fieldResponses)
					.set({ value: categoryValue })
					.where(eq(fieldResponses.id, existingResponse.id));
			} else {
				await tx.insert(fieldResponses).values({
					entityType: "registration",
					entityId: reg.id,
					fieldId: categoryFieldId,
					value: categoryValue,
				});
			}

			await tx.insert(users).values({
				username: reg.email,
				password: reg.password,
				role: "public",
				registrationId: reg.id,
			});

			await tx
				.update(registrations)
				.set({ accepted: true, rejectionReason: null })
				.where(eq(registrations.id, regId));
		});

		const userName = await getRegistrationName(
			reg.id,
			config.registrationNameFieldId,
		);

		await sendEmail({
			to: reg.email,
			subject: "SIF Portal Registration Approved",
			message: `Dear ${userName},

Greetings from the Sophisticated Instrumentation Facility (SIF)!

We are pleased to inform you that your registration on the SIF Portal has been successfully reviewed and approved. Your account is now active.

You may now log in to the portal and proceed with instrument booking requests as per your requirement.

If you need any assistance, please feel free to contact us at sif@nitt.edu/9489394853

Warm regards,
SIF Office
NIT Trichy`,
		});
	});

const RejectRegistrationInput = z.object({
	regId: z.number(),
	reason: z.string().min(1, "Rejection reason is required"),
});

export const rejectRegistration = createServerFn({ method: "POST" })
	.inputValidator(RejectRegistrationInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const { regId, reason } = safeParseAndThrow(
			data,
			RejectRegistrationInput,
		);

		const [reg] = await db
			.select()
			.from(registrations)
			.where(eq(registrations.id, regId));

		if (!reg) {
			throw new Error("Registration not found");
		}

		await db
			.update(registrations)
			.set({ accepted: false, rejectionReason: reason })
			.where(eq(registrations.id, regId));

		await sendEmail({
			to: reg.email,
			subject: "Registration Rejected",
			message: `Your registration (ID: ${regId}) has been rejected. Reason: ${reason}`,
		});
	});
