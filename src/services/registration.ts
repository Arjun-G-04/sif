import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { hash } from "bcrypt";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { sendEmail } from "@/lib/email";
import { db } from "../db";
import { fieldResponses, fields, registrations, users } from "../db/schema";
import { requireAdmin } from "../lib/auth";
import { safeParseAndThrow } from "../lib/utils";
import { getFieldResponses } from "./field";

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

		// Hash password
		const hashedPassword = await hash(password, 10);

		// Get all registration fields to identify which FormData entries are dynamic fields
		const registrationFields = await db
			.select({ id: fields.id, name: fields.name, type: fields.type })
			.from(fields)
			.where(eq(fields.entityType, "registration"));

		// Map by field ID (as string, since FormData keys are strings)
		const fieldIdToField = new Map(
			registrationFields.map((f) => [String(f.id), f]),
		);

		// Insert registration record
		const [registration] = await db
			.insert(registrations)
			.values({
				password: hashedPassword,
				email,
				phone,
			})
			.returning({ id: registrations.id });

		// Process dynamic fields
		const fieldResponsesToInsert: {
			entityType: "registration";
			entityId: number;
			fieldId: number;
			value: string | null;
		}[] = [];

		for (const [key, value] of formData.entries()) {
			// Skip base fields
			if (["username", "password", "email", "phone"].includes(key)) {
				continue;
			}

			const field = fieldIdToField.get(key);
			if (!field) {
				continue; // Skip unknown fields
			}

			let fieldValue: string | null = null;

			if (
				field.type === "file" &&
				value instanceof File &&
				value.size > 0
			) {
				// Handle file upload
				const mediaDir = join(
					process.cwd(),
					"media",
					"registrations",
					String(registration.id),
				);
				await mkdir(mediaDir, { recursive: true });

				const fileName = `${field.id}_${value.name}`;
				const filePath = join(mediaDir, fileName);

				const arrayBuffer = await value.arrayBuffer();
				await writeFile(filePath, Buffer.from(arrayBuffer));

				// Store relative path
				fieldValue = `media/registrations/${registration.id}/${fileName}`;
			} else if (typeof value === "string") {
				fieldValue = value;
			}

			fieldResponsesToInsert.push({
				entityType: "registration",
				entityId: registration.id,
				fieldId: field.id,
				value: fieldValue,
			});
		}

		// Insert all field responses
		if (fieldResponsesToInsert.length > 0) {
			await db.insert(fieldResponses).values(fieldResponsesToInsert);
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
