import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { hash } from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { fieldResponses, fields, registrations } from "../db/schema";
import { requireAdmin } from "../lib/auth";
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
					String(registration.id),
				);
				await mkdir(mediaDir, { recursive: true });

				const fileName = `${field.id}_${value.name}`;
				const filePath = join(mediaDir, fileName);

				const arrayBuffer = await value.arrayBuffer();
				await writeFile(filePath, Buffer.from(arrayBuffer));

				// Store relative path
				fieldValue = `media/${registration.id}/${fileName}`;
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

		// Get all registrations
		const allRegistrations = await db.select().from(registrations);

		// Get field responses for each registration
		const result = await Promise.all(
			allRegistrations.map(async (reg) => {
				const { password: _password, ...regData } = reg;
				const responses = await getFieldResponses(
					"registration",
					reg.id,
				);
				return {
					...regData,
					responses,
				};
			}),
		);

		return result;
	},
);
