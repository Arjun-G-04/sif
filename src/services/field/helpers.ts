import { createServerOnlyFn } from "@tanstack/react-start";
import {
	aliasedTable,
	and,
	eq,
	ilike,
	inArray,
	isNull,
	ne,
	or,
	sql,
} from "drizzle-orm";
import { saveUploadedFile } from "@/lib/files";
import { db } from "../../db";
import {
	type entityType,
	fieldGroups,
	fieldRelations,
	fieldResponses,
	fields,
	type fieldStage,
	registrations,
	users,
} from "../../db/schema";
import type { FieldEntry } from "./types";

export const getAlternateEmailFieldId = (): number | null => {
	const raw = (
		process.env.EMAIL_FIELD_ID || process.env.ALTERNATE_EMAIL_FIELD_ID
	)
		?.replace(/['"]/g, "")
		.trim();
	if (!raw) return null;
	const id = Number.parseInt(raw, 10);
	return Number.isNaN(id) ? null : id;
};

export const getAlternatePhoneFieldId = (): number | null => {
	const raw = (
		process.env.PHONE_NO_ID ||
		process.env.PHONE_FIELD_ID ||
		process.env.ALTERNATE_PHONE_FIELD_ID
	)
		?.replace(/['"]/g, "")
		.trim();
	if (!raw) return null;
	const id = Number.parseInt(raw, 10);
	return Number.isNaN(id) ? null : id;
};

export const isEmailField = (fieldId: number): boolean => {
	const targetId = getAlternateEmailFieldId();
	return targetId !== null && fieldId === targetId;
};

export const isPhoneField = (fieldId: number): boolean => {
	const targetId = getAlternatePhoneFieldId();
	return targetId !== null && fieldId === targetId;
};

export const isUniqueField = (fieldId: number): boolean => {
	return isEmailField(fieldId) || isPhoneField(fieldId);
};

export const checkFieldUniqueness = createServerOnlyFn(
	async (
		fieldId: number,
		value: string,
		fieldName: string,
		excludeRegId?: number,
	) => {
		const trimmed = value.trim();
		if (!trimmed) return;

		const isEmail = isEmailField(fieldId);
		const isPhone = isPhoneField(fieldId);

		// 1. Check uniqueness within fieldResponses (across active or pending registrations)
		const cleanPhone = isPhone ? trimmed.replace(/\D/g, "") : "";
		const phoneCondition =
			cleanPhone.length >= 10
				? or(
						sql`RIGHT(regexp_replace(${fieldResponses.value}, '[^0-9]', '', 'g'), 10) = ${cleanPhone.slice(-10)}`,
						eq(fieldResponses.value, cleanPhone),
						eq(fieldResponses.value, trimmed),
					)
				: eq(fieldResponses.value, trimmed);

		const [existingResponse] = await db
			.select({ id: fieldResponses.id })
			.from(fieldResponses)
			.innerJoin(
				registrations,
				eq(fieldResponses.entityId, registrations.id),
			)
			.where(
				and(
					eq(fieldResponses.entityType, "registration"),
					eq(fieldResponses.fieldId, fieldId),
					isPhone
						? phoneCondition
						: ilike(fieldResponses.value, trimmed),
					or(
						isNull(registrations.accepted),
						eq(registrations.accepted, true),
					),
					excludeRegId
						? ne(fieldResponses.entityId, excludeRegId)
						: undefined,
				),
			)
			.limit(1);

		if (existingResponse) {
			throw new Error(
				`Field "${fieldName}" with value "${trimmed}" is already registered.`,
			);
		}

		// 2. Cross-uniqueness check against registrations table (primary contacts)
		if (isEmail) {
			// Check if this alternate email matches someone else's primary email
			const [existingPrimaryEmail] = await db
				.select({ id: registrations.id })
				.from(registrations)
				.where(
					and(
						ilike(registrations.email, trimmed),
						or(
							isNull(registrations.accepted),
							eq(registrations.accepted, true),
						),
						excludeRegId
							? ne(registrations.id, excludeRegId)
							: undefined,
					),
				)
				.limit(1);

			if (existingPrimaryEmail) {
				throw new Error(
					`"${trimmed}" is already registered as a primary email.`,
				);
			}
		}

		if (isPhone) {
			// Check if this alternate phone matches someone else's primary phone
			const primaryPhoneCondition =
				cleanPhone.length >= 10
					? or(
							sql`RIGHT(regexp_replace(${registrations.phone}, '[^0-9]', '', 'g'), 10) = ${cleanPhone.slice(-10)}`,
							eq(registrations.phone, cleanPhone),
							eq(registrations.phone, trimmed),
						)
					: eq(registrations.phone, trimmed);

			const [existingPrimaryPhone] = await db
				.select({ id: registrations.id })
				.from(registrations)
				.where(
					and(
						primaryPhoneCondition,
						or(
							isNull(registrations.accepted),
							eq(registrations.accepted, true),
						),
						excludeRegId
							? ne(registrations.id, excludeRegId)
							: undefined,
					),
				)
				.limit(1);

			if (existingPrimaryPhone) {
				throw new Error(
					`"${trimmed}" is already registered as a primary phone number.`,
				);
			}
		}
	},
);

export interface ParseFieldResponsesOptions {
	skipKeys?: string[];
	stage?: (typeof fieldStage.enumValues)[number];
	userId?: number;
	registrationId?: number;
}

export const validateCharCount = createServerOnlyFn(
	(
		field: {
			name: string;
			type: string;
			charLimitType?: "max" | "exact" | null;
			charLimit?: number | null;
		},
		value: string | null | undefined,
		options?: { itemIndex?: number },
	) => {
		if (field.type !== "text" || !field.charLimitType || !field.charLimit) {
			return;
		}

		const str = typeof value === "string" ? value.trim() : "";
		if (!str) {
			return;
		}

		const context =
			options?.itemIndex !== undefined
				? ` for item ${options.itemIndex}`
				: "";

		if (field.charLimitType === "max") {
			if (str.length > field.charLimit) {
				throw new Error(
					`Field "${field.name}"${context} must not exceed ${field.charLimit} characters.`,
				);
			}
		} else if (field.charLimitType === "exact") {
			if (str.length !== field.charLimit) {
				throw new Error(
					`Field "${field.name}"${context} must be exactly ${field.charLimit} characters.`,
				);
			}
		}
	},
);

export const parseFieldResponses = createServerOnlyFn(
	async (
		formData: FormData,
		type: (typeof entityType.enumValues)[number],
		entityId: number | undefined,
		fileSubPath: string,
		options: ParseFieldResponsesOptions = {},
	): Promise<FieldEntry[]> => {
		const { skipKeys = [], stage, userId } = options;

		// Fetch fields from database
		const entityFields = await db
			.select({
				id: fields.id,
				name: fields.name,
				type: fields.type,
				parentId: fields.parentId,
				required: fields.required,
				charLimitType: fields.charLimitType,
				charLimit: fields.charLimit,
			})
			.from(fields)
			.where(
				and(
					eq(fields.entityType, type),
					entityId === undefined
						? isNull(fields.entityId)
						: type === "equipment"
							? or(
									eq(fields.entityId, entityId),
									isNull(fields.entityId),
								)
							: eq(fields.entityId, entityId),
					eq(fields.active, true),
					stage ? eq(fields.stage, stage) : undefined,
				),
			);

		// Map by field ID for easy lookup
		const fieldIdToField = new Map(
			entityFields.map((f) => [String(f.id), f]),
		);

		// Fetch relation definitions and DB values if any relation fields exist
		const relationFields = entityFields.filter(
			(f) => f.type === "relation",
		);
		const relationFieldIds = relationFields.map((f) => f.id);
		let relationMap = new Map<number, typeof fieldRelations.$inferSelect>();
		let registrationResponseMap = new Map<number, string | null>();

		if (relationFieldIds.length > 0) {
			const relations = await db
				.select()
				.from(fieldRelations)
				.where(inArray(fieldRelations.fieldId, relationFieldIds));
			relationMap = new Map(relations.map((r) => [r.fieldId, r]));

			if (userId) {
				const regResponses = await db
					.select({
						fieldId: fieldResponses.fieldId,
						value: fieldResponses.value,
					})
					.from(fieldResponses)
					.innerJoin(
						users,
						eq(users.registrationId, fieldResponses.entityId),
					)
					.where(
						and(
							eq(users.id, userId),
							eq(fieldResponses.entityType, "registration"),
						),
					);
				registrationResponseMap = new Map(
					regResponses.map((r) => [r.fieldId, r.value]),
				);
			}
		}

		// Fetch group constraints
		const parentIds = [
			...new Set(
				entityFields
					.map((f) => f.parentId)
					.filter((id): id is number => id !== null),
			),
		];
		const groupConstraints = new Map<number, number>();

		if (parentIds.length > 0) {
			const groups = await db
				.select({ fieldId: fieldGroups.fieldId, max: fieldGroups.max })
				.from(fieldGroups)
				.where(inArray(fieldGroups.fieldId, parentIds));

			for (const g of groups) {
				groupConstraints.set(g.fieldId, g.max);
			}
		}

		const fieldEntries: FieldEntry[] = [];

		// Parse form entries: format is {fieldId} or {fieldId}_{iteration}
		for (const [key, value] of formData.entries()) {
			if (skipKeys.includes(key)) continue;

			const match = key.match(/^(\d+)(?:_(\d+))?$/);
			if (!match) continue;

			const fieldIdRaw = match[1];
			const iterationRaw = match[2];

			const field = fieldIdToField.get(fieldIdRaw);
			if (!field) continue;

			// Security: Never trust client-submitted values for relation fields.
			// Relation fields are populated directly from the DB below.
			if (field.type === "relation") continue;

			const iteration = iterationRaw ? parseInt(iterationRaw, 10) : 0;

			if (field.parentId) {
				const max = groupConstraints.get(field.parentId);
				if (max !== undefined && iteration >= max) {
					throw new Error(
						`Field ${field.name} exceeds maximum allowed iterations (${max}) for its group.`,
					);
				}
			}

			let fieldValue: string | null = null;

			if (
				field.type === "file" &&
				value instanceof File &&
				value.size > 0
			) {
				const { relativePath } = await saveUploadedFile({
					subPath: fileSubPath,
					file: value,
				});
				fieldValue = relativePath;
			} else if (typeof value === "string") {
				fieldValue = value;
			}

			fieldEntries.push({
				fieldId: field.id,
				iteration,
				value: fieldValue,
			});
		}

		// Securely populate relation fields from DB registration responses
		for (const relField of relationFields) {
			const relationDef = relationMap.get(relField.id);
			let relationValue: string | null = null;
			if (
				relationDef &&
				relationDef.relatedEntityType === "registration"
			) {
				relationValue =
					registrationResponseMap.get(relationDef.relatedFieldId) ??
					null;
			}

			fieldEntries.push({
				fieldId: relField.id,
				iteration: 0,
				value: relationValue,
			});
		}

		// Find iteration counts for each parent group
		const groupIterations = new Map<number, number>();
		for (const entry of fieldEntries) {
			const field = fieldIdToField.get(String(entry.fieldId));
			if (field?.parentId !== null && field?.parentId !== undefined) {
				const currentMax = groupIterations.get(field.parentId) ?? 0;
				if (entry.iteration >= currentMax) {
					groupIterations.set(field.parentId, entry.iteration + 1);
				}
			}
		}

		// Validate required fields
		for (const field of entityFields) {
			if (
				field.type === "heading" ||
				field.type === "info_text" ||
				field.type === "admin_file" ||
				field.type === "group"
			) {
				continue;
			}

			if (field.parentId === null) {
				// Top-level field
				const entry = fieldEntries.find(
					(e) => e.fieldId === field.id && e.iteration === 0,
				);
				if (field.required) {
					if (
						!entry ||
						entry.value === null ||
						entry.value === undefined ||
						entry.value.trim() === ""
					) {
						if (field.type === "relation") {
							throw new Error(
								`Field "${field.name}" is missing in your profile. Please update your profile.`,
							);
						}
						throw new Error(`Field "${field.name}" is required.`);
					}
				}
				if (
					entry &&
					entry.value !== null &&
					entry.value !== undefined
				) {
					validateCharCount(field, entry.value);
				}
			} else {
				// Nested field under parent group
				const numIterations = groupIterations.get(field.parentId) ?? 0;
				if (numIterations > 0) {
					for (let i = 0; i < numIterations; i++) {
						const entry = fieldEntries.find(
							(e) => e.fieldId === field.id && e.iteration === i,
						);
						if (field.required) {
							if (
								!entry ||
								entry.value === null ||
								entry.value === undefined ||
								entry.value.trim() === ""
							) {
								if (field.type === "relation") {
									throw new Error(
										`Field "${field.name}" is missing in your profile. Please update your profile.`,
									);
								}
								throw new Error(
									`Field "${field.name}" is required for item ${i + 1}.`,
								);
							}
						}
						if (
							entry &&
							entry.value !== null &&
							entry.value !== undefined
						) {
							validateCharCount(field, entry.value, {
								itemIndex: i + 1,
							});
						}
					}
				}
			}
		}

		// Check uniqueness for email and phone fields in registration
		if (type === "registration") {
			const seenValues = new Set<string>();
			for (const entry of fieldEntries) {
				if (!entry.value || typeof entry.value !== "string") continue;
				const field = fieldIdToField.get(String(entry.fieldId));
				if (field && isUniqueField(field.id)) {
					const normalized = isEmailField(field.id)
						? entry.value.trim().toLowerCase()
						: isPhoneField(field.id)
							? entry.value.replace(/\D/g, "").slice(-10) ||
								entry.value.trim()
							: entry.value.trim();
					if (seenValues.has(normalized)) {
						throw new Error(
							`Duplicate value "${entry.value.trim()}" entered for "${field.name}".`,
						);
					}
					seenValues.add(normalized);

					await checkFieldUniqueness(
						entry.fieldId,
						entry.value,
						field.name,
						options.registrationId,
					);
				}
			}
		}

		return fieldEntries;
	},
);

export const getFieldResponses = createServerOnlyFn(
	async (
		type: (typeof entityType.enumValues)[number],
		entityId: number,
		bookingId?: number,
	) => {
		const parentFields = aliasedTable(fields, "parentFields");
		const rows = await db
			.select({
				response: fieldResponses,
				field: fields,
				parentOrder: parentFields.order,
			})
			.from(fieldResponses)
			.leftJoin(fields, eq(fieldResponses.fieldId, fields.id))
			.leftJoin(parentFields, eq(fields.parentId, parentFields.id))
			.where(
				and(
					eq(fieldResponses.entityType, type),
					eq(fieldResponses.entityId, entityId),
					bookingId
						? eq(fieldResponses.bookingId, bookingId)
						: undefined,
				),
			);

		return rows
			.filter(
				(
					row,
				): row is typeof row & {
					field: NonNullable<typeof row.field>;
				} => row.field !== null,
			)
			.map((row) => ({
				responseId: row.response.id,
				fieldId: row.field.id,
				fieldName: row.field.name,
				fieldType: row.field.type,
				value: row.response.value,
				adminValue: row.response.adminValue,
				iteration: row.response.iteration,
				order: row.field.order,
				stage: row.field.stage,
				parentId: row.field.parentId,
				parentOrder: row.parentOrder,
			}));
	},
);
