import { createServerOnlyFn } from "@tanstack/react-start";
import { and, eq, aliasedTable } from "drizzle-orm";
import { saveUploadedFile } from "@/lib/files";
import { db } from "../../db";
import { type entityType, fieldResponses, fields } from "../../db/schema";
import type { FieldEntry } from "./types";

export const parseFieldResponses = createServerOnlyFn(
	async (
		formData: FormData,
		type: (typeof entityType.enumValues)[number],
		entityId: number | undefined,
		fileSubPath: string,
		skipKeys: string[] = [],
	): Promise<FieldEntry[]> => {
		// Fetch fields from database
		const entityFields = await db
			.select({ id: fields.id, name: fields.name, type: fields.type })
			.from(fields)
			.where(
				and(
					eq(fields.entityType, type),
					entityId ? eq(fields.entityId, entityId) : undefined,
					eq(fields.active, true),
				),
			);

		// Map by field ID for easy lookup
		const fieldIdToField = new Map(
			entityFields.map((f) => [String(f.id), f]),
		);

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

			const iteration = iterationRaw ? parseInt(iterationRaw, 10) : 0;

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
