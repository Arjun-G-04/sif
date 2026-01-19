import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { and, asc, eq, isNull } from "drizzle-orm";
import * as z from "zod";
import { db } from "../../db";
import {
	entityType,
	fieldAdminFiles,
	fieldGroups,
	fieldOptions,
	fieldRelations,
	fields,
} from "../../db/schema";
import { requireAdmin } from "../../lib/auth";
import { safeParseAndThrow } from "../../lib/utils";
import { GetFieldsInput } from "./schemas";
import type { Field } from "./types";

export const fetchFieldsFromDb = createServerOnlyFn(
	async (
		type: (typeof entityType.enumValues)[number],
		includeInactive = false,
		id?: number,
	) => {
		const rows = await db
			.select({
				field: fields,
				option: fieldOptions,
				relation: fieldRelations,
				group: fieldGroups,
				adminFile: fieldAdminFiles,
			})
			.from(fields)
			.leftJoin(fieldOptions, eq(fields.id, fieldOptions.fieldId))
			.leftJoin(fieldRelations, eq(fields.id, fieldRelations.fieldId))
			.leftJoin(fieldGroups, eq(fields.id, fieldGroups.fieldId))
			.leftJoin(fieldAdminFiles, eq(fields.id, fieldAdminFiles.fieldId))
			.where(
				and(
					eq(fields.entityType, type),
					id ? eq(fields.entityId, id) : undefined,
					includeInactive ? undefined : eq(fields.active, true),
				),
			)
			.orderBy(asc(fields.order), fields.id);

		// First pass: unify rows into flat unique fields with data attached
		const flatFieldsMap = new Map<number, Field>();

		for (const row of rows) {
			if (!flatFieldsMap.has(row.field.id)) {
				let field: Field;
				if (row.field.type === "single_select") {
					field = {
						...row.field,
						type: "single_select",
						options: [],
					} as Field;
				} else if (row.field.type === "relation" && row.relation) {
					field = {
						...row.field,
						type: "relation",
						relation: row.relation,
					} as Field;
				} else if (row.field.type === "group" && row.group) {
					field = {
						...row.field,
						type: "group",
						groupConfig: row.group,
						children: [],
					} as Field;
				} else if (row.field.type === "admin_file" && row.adminFile) {
					field = {
						...row.field,
						type: "admin_file",
						adminFileConfig: row.adminFile,
					} as Field;
				} else {
					field = { ...row.field } as Field;
				}
				flatFieldsMap.set(row.field.id, field);
			}

			const field = flatFieldsMap.get(row.field.id);
			if (
				field &&
				row.option &&
				field.type === "single_select" &&
				!field.options.some((o) => o.id === row.option?.id)
			) {
				field.options.push(row.option);
			}
		}

		const allFields = Array.from(flatFieldsMap.values());

		// Second pass: build hierarchy
		const rootFields: Field[] = [];
		const fieldsById = new Map(allFields.map((f) => [f.id, f]));

		for (const field of allFields) {
			if (field.parentId) {
				const parent = fieldsById.get(field.parentId);
				if (parent && parent.type === "group") {
					if (!parent.children) parent.children = [];
					parent.children.push(field);
				} else {
					// Fallback if parent missing or not a group: show at root
					rootFields.push(field);
				}
			} else {
				rootFields.push(field);
			}
		}

		return rootFields;
	},
);

export const getFields = createServerFn({ method: "GET" })
	.inputValidator(GetFieldsInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, GetFieldsInput);

		return await fetchFieldsFromDb(
			parsedData.entityType,
			true,
			parsedData.entityId,
		);
	});

export const getRelationFields = createServerFn({ method: "GET" })
	.inputValidator(z.object({ entityType: z.enum(entityType.enumValues) }))
	.handler(async ({ data }) => {
		await requireAdmin();
		// Fetch fields of the target entity type suitable for relation
		const result = await db
			.select({ id: fields.id, name: fields.name, type: fields.type })
			.from(fields)
			.where(
				and(
					eq(fields.entityType, data.entityType),
					eq(fields.active, true),
					isNull(fields.parentId), // Only top-level fields
				),
			);
		return result;
	});
