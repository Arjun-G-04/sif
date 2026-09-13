import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { fieldResponses, registrations, users } from "../db/schema";
import { requireUser } from "../lib/auth";
import { saveUploadedFile } from "../lib/files";
import { getFieldResponses, validateCharCount } from "./field/helpers";
import { fetchFieldsFromDb } from "./field/queries";
import type { Field } from "./field/types";

export type ProfileResponse = Awaited<
	ReturnType<typeof getFieldResponses>
>[number];

export interface UserProfileData {
	user: {
		username: string;
		email: string;
		phone: string;
		createdAt: Date | null;
		accepted: boolean | null;
		hasRegistration: boolean;
	};
	submittedResponses: ProfileResponse[];
	missingFields: Field[];
}

export const getUserProfile = createServerFn({ method: "GET" }).handler(
	async (): Promise<UserProfileData> => {
		const authUser = await requireUser();

		const [userWithReg] = await db
			.select({
				id: users.id,
				username: users.username,
				registrationId: users.registrationId,
				regEmail: registrations.email,
				regPhone: registrations.phone,
				regCreatedAt: registrations.createdAt,
				regAccepted: registrations.accepted,
			})
			.from(users)
			.leftJoin(registrations, eq(users.registrationId, registrations.id))
			.where(eq(users.username, authUser.username))
			.limit(1);

		if (!userWithReg) {
			throw new Error("User not found");
		}

		if (!userWithReg.registrationId) {
			return {
				user: {
					username: userWithReg.username,
					email: userWithReg.username,
					phone: "",
					createdAt: null,
					accepted: null,
					hasRegistration: false,
				},
				submittedResponses: [],
				missingFields: [],
			};
		}

		const regId = userWithReg.registrationId;

		// Fetch responses and active fields concurrently
		const [responses, activeFields] = await Promise.all([
			getFieldResponses("registration", regId),
			fetchFieldsFromDb("registration", false),
		]);

		// Collect field IDs that have already been answered
		const answeredFieldIds = new Set<number>();
		const answeredResponses: ProfileResponse[] = [];

		for (const resp of responses) {
			const hasVal = Boolean(
				(resp.value && resp.value.trim() !== "") ||
					(resp.adminValue && resp.adminValue.trim() !== ""),
			);
			if (hasVal) {
				answeredFieldIds.add(resp.fieldId);
				answeredResponses.push(resp);
			}
		}

		// Filter active fields for unsubmitted inputs
		const missingFields: Field[] = [];
		for (const field of activeFields) {
			if (
				field.type === "heading" ||
				field.type === "info_text" ||
				field.type === "admin_file"
			) {
				continue;
			}

			if (field.type === "group") {
				const hasAnyAnswer = field.children?.some((child) =>
					answeredFieldIds.has(child.id),
				);
				if (
					!hasAnyAnswer &&
					field.children &&
					field.children.length > 0
				) {
					missingFields.push(field);
				}
			} else if (!answeredFieldIds.has(field.id)) {
				missingFields.push(field);
			}
		}

		return {
			user: {
				username: userWithReg.username,
				email: userWithReg.regEmail || userWithReg.username,
				phone: userWithReg.regPhone || "",
				createdAt: userWithReg.regCreatedAt,
				accepted: userWithReg.regAccepted,
				hasRegistration: true,
			},
			submittedResponses: answeredResponses,
			missingFields,
		};
	},
);

export const updateUserProfile = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as FormData)
	.handler(async ({ data: formData }) => {
		const authUser = await requireUser();

		const [user] = await db
			.select({
				id: users.id,
				registrationId: users.registrationId,
			})
			.from(users)
			.where(eq(users.username, authUser.username))
			.limit(1);

		if (!user || !user.registrationId) {
			throw new Error("Registration record not found for this user");
		}

		const regId = user.registrationId;

		// 1. Fetch active registration fields and existing responses concurrently
		const [activeFields, existingResponses] = await Promise.all([
			fetchFieldsFromDb("registration", false),
			getFieldResponses("registration", regId),
		]);

		// 2. Identify fields that already have submitted responses (locked from editing)
		const lockedFieldIds = new Set<number>();
		for (const resp of existingResponses) {
			if (
				(resp.value && resp.value.trim() !== "") ||
				(resp.adminValue && resp.adminValue.trim() !== "")
			) {
				lockedFieldIds.add(resp.fieldId);
			}
		}

		// 3. Map all editable fields (excluding container / layout types)
		const fieldMap = new Map<number, Field>();
		const flattenFields = (list: Field[]) => {
			for (const f of list) {
				if (
					f.type !== "heading" &&
					f.type !== "info_text" &&
					f.type !== "admin_file" &&
					f.type !== "group"
				) {
					fieldMap.set(f.id, f);
				}
				if (f.children && f.children.length > 0) {
					flattenFields(f.children);
				}
			}
		};
		flattenFields(activeFields);

		// Allowed fields are valid input fields that are NOT already locked
		const allowedFieldIds = new Set<number>();
		for (const id of fieldMap.keys()) {
			if (!lockedFieldIds.has(id)) {
				allowedFieldIds.add(id);
			}
		}

		// 4. Parse incoming values from formData
		// Handles single fields (${fieldId}) and group iterations (${fieldId}_${iteration})
		const updatesToPerform: {
			fieldId: number;
			iteration: number;
			value: string;
		}[] = [];

		for (const [key, val] of formData.entries()) {
			const match = key.match(/^(\d+)(?:_(\d+))?$/);
			if (!match) continue;

			const fieldId = parseInt(match[1], 10);
			const iteration = match[2] ? parseInt(match[2], 10) : 0;

			// Security check: field must be allowed and currently empty
			if (!allowedFieldIds.has(fieldId)) {
				continue;
			}

			const field = fieldMap.get(fieldId);
			if (!field) continue;

			let finalValue: string | null = null;
			if (field.type === "file") {
				if (val instanceof File && val.size > 0) {
					const { relativePath } = await saveUploadedFile({
						subPath: `registrations/${regId}`,
						file: val,
					});
					finalValue = relativePath;
				}
			} else if (typeof val === "string") {
				finalValue = val.trim();
			}

			if (finalValue && finalValue.length > 0) {
				validateCharCount(
					field,
					finalValue,
					field.parentId ? { itemIndex: iteration + 1 } : undefined,
				);
				updatesToPerform.push({
					fieldId,
					iteration,
					value: finalValue,
				});
			}
		}

		// 5. Enforce required validation on top-level unfilled fields
		for (const fieldId of allowedFieldIds) {
			const field = fieldMap.get(fieldId);
			if (field?.required && field.parentId === null) {
				const submitted = updatesToPerform.find(
					(u) => u.fieldId === fieldId && u.iteration === 0,
				);
				if (!submitted || !submitted.value) {
					throw new Error(`Field "${field.name}" is required.`);
				}
			}
		}

		// 6. Persist to database in a transaction
		if (updatesToPerform.length > 0) {
			await db.transaction(async (tx) => {
				for (const item of updatesToPerform) {
					const [existing] = await tx
						.select({ id: fieldResponses.id })
						.from(fieldResponses)
						.where(
							and(
								eq(fieldResponses.entityType, "registration"),
								eq(fieldResponses.entityId, regId),
								eq(fieldResponses.fieldId, item.fieldId),
								eq(fieldResponses.iteration, item.iteration),
							),
						)
						.limit(1);

					if (existing) {
						await tx
							.update(fieldResponses)
							.set({ value: item.value })
							.where(eq(fieldResponses.id, existing.id));
					} else {
						await tx.insert(fieldResponses).values({
							entityType: "registration",
							entityId: regId,
							fieldId: item.fieldId,
							value: item.value,
							iteration: item.iteration,
						});
					}
				}
			});
		}

		return { success: true, updatedCount: updatesToPerform.length };
	});
