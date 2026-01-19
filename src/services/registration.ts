import { createServerFn } from "@tanstack/react-start";
import { hash } from "bcrypt";
import { eq, and } from "drizzle-orm";
import * as z from "zod";
import { sendEmail } from "@/lib/email";
import { db } from "../db";
import {
	fieldResponses,
	otpVerifications,
	registrations,
	users,
} from "../db/schema";
import { requireAdmin } from "../lib/auth";
import { safeParseAndThrow } from "../lib/utils";
import {
	fetchFieldsFromDb,
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

		// 1. Check if user already exists
		const [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.username, email))
			.limit(1);

		if (existingUser) {
			throw new Error("A user with this email already exists");
		}

		// 2. Verify Email OTP
		const [emailVerification] = await db
			.select()
			.from(otpVerifications)
			.where(
				and(
					eq(otpVerifications.type, "email"),
					eq(otpVerifications.target, email),
					eq(otpVerifications.verified, true),
				),
			)
			.orderBy(otpVerifications.createdAt)
			.limit(1);

		if (!emailVerification) {
			throw new Error("Email has not been verified with OTP");
		}

		// 3. Verify Phone OTP
		const [phoneVerification] = await db
			.select()
			.from(otpVerifications)
			.where(
				and(
					eq(otpVerifications.type, "phone"),
					eq(otpVerifications.target, phone),
					eq(otpVerifications.verified, true),
				),
			)
			.orderBy(otpVerifications.createdAt)
			.limit(1);

		if (!phoneVerification) {
			throw new Error("Phone number has not been verified with OTP");
		}

		// Hash password
		const hashedPassword = await hash(password, 10);

		// Insert registration record
		const [registration] = await db
			.insert(registrations)
			.values({
				password: hashedPassword,
				email,
				phone,
			})
			.returning({ id: registrations.id });

		// Parse form data using the shared helper
		const fieldEntries = await parseFieldResponses(
			formData,
			"registration",
			undefined, // No specific entity ID for registration fields
			`registrations/${registration.id}`,
			["username", "password", "email", "phone"],
		);

		// Insert all field responses
		if (fieldEntries.length > 0) {
			await db.insert(fieldResponses).values(
				fieldEntries.map((entry) => ({
					entityType: "registration" as const,
					entityId: registration.id,
					fieldId: entry.fieldId,
					value: entry.value,
					iteration: entry.iteration,
				})),
			);
		}

		if (process.env.NODE_ENV === "production") {
			const config = await getConfigHelper();
			if (config?.officeEmail) {
				await sendEmail({
					to: config.officeEmail,
					subject: "New Registration",
					message: `A new registration (ID: ${registration.id}) has been submitted.`,
				});
			}
		}

		return { success: true, registrationId: registration.id };
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
			.from(registrations);
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

const AcceptRegistrationInput = z.object({
	regId: z.number(),
});

export const acceptRegistration = createServerFn({ method: "POST" })
	.inputValidator(AcceptRegistrationInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const { regId } = safeParseAndThrow(data, AcceptRegistrationInput);

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

		if (process.env.NODE_ENV === "production") {
			await sendEmail({
				to: reg.email,
				subject: "Registration Accepted",
				message: `Your registration (ID: ${regId}) has been accepted. Please login with your registered email and password.`,
			});
		}
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

		if (process.env.NODE_ENV === "production") {
			await sendEmail({
				to: reg.email,
				subject: "Registration Rejected",
				message: `Your registration (ID: ${regId}) has been rejected. Reason: ${reason}`,
			});
		} else {
			console.log(
				`Registration (ID: ${regId}) rejected. Reason: ${reason}`,
			);
		}
	});

export const getPublicRegistrationFields = createServerFn({
	method: "GET",
}).handler(async () => {
	return await fetchFieldsFromDb("registration", false);
});
