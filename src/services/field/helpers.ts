import { createServerOnlyFn } from "@tanstack/react-start";
import { aliasedTable, and, eq, inArray, isNull, or } from "drizzle-orm";
import { saveUploadedFile } from "@/lib/files";
import { db } from "../../db";
import {
	type entityType,
	fieldGroups,
	fieldRelations,
	fieldResponses,
	fields,
	type fieldStage,
	users,
} from "../../db/schema";
import type { FieldEntry } from "./types";

export interface ParseFieldResponsesOptions {
	skipKeys?: string[];
	stage?: (typeof fieldStage.enumValues)[number];
	userId?: number;
}

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
				if (field.required) {
					const entry = fieldEntries.find(
						(e) => e.fieldId === field.id && e.iteration === 0,
					);
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
			} else {
				// Nested field under parent group
				const numIterations = groupIterations.get(field.parentId) ?? 0;
				if (numIterations > 0 && field.required) {
					for (let i = 0; i < numIterations; i++) {
						const entry = fieldEntries.find(
							(e) => e.fieldId === field.id && e.iteration === i,
						);
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
