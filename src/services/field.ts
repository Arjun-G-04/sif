import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "../db";
import {
	entityType,
	fieldOptions,
	fieldResponses,
	fields,
	fieldType,
} from "../db/schema";
import { requireAdmin } from "../lib/auth";
import { safeParseAndThrow } from "../lib/utils";

const CreateFieldInput = z.object({
	entityType: z.enum(entityType.enumValues, "Invalid entity type"),
	name: z.string().min(1, "Field name is required"),
	type: z.enum(fieldType.enumValues, "Invalid field type"),
	order: z.number().int().default(0),
	options: z.array(z.string()).optional(),
});

export type Field =
	| (typeof fields.$inferSelect & {
			type: "single_select";
			options: (typeof fieldOptions.$inferSelect)[];
	  })
	| (typeof fields.$inferSelect & {
			type: Exclude<
				(typeof fieldType.enumValues)[number],
				"single_select"
			>;
	  });

export const createField = createServerFn({ method: "POST" })
	.inputValidator(CreateFieldInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, CreateFieldInput);

		await db.transaction(async (tx) => {
			const [newField] = await tx
				.insert(fields)
				.values({
					entityType: parsedData.entityType,
					name: parsedData.name,
					type: parsedData.type,
					order: parsedData.order,
				})
				.returning({ id: fields.id });

			if (
				parsedData.type === "single_select" &&
				parsedData.options &&
				parsedData.options.length > 0
			) {
				await tx.insert(fieldOptions).values(
					parsedData.options.map((opt) => ({
						fieldId: newField.id,
						value: opt,
					})),
				);
			}
		});
	});

const UpdateFieldInput = z.object({
	id: z.number().int(),
	name: z.string().min(1, "Field name is required"),
	type: z.enum(fieldType.enumValues, "Invalid field type"),
	order: z.number().int().default(0),
	options: z.array(z.string()).optional(),
});

export const updateField = createServerFn({ method: "POST" })
	.inputValidator(UpdateFieldInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, UpdateFieldInput);

		await db.transaction(async (tx) => {
			await tx
				.update(fields)
				.set({
					name: parsedData.name,
					type: parsedData.type,
					order: parsedData.order,
				})
				.where(eq(fields.id, parsedData.id));

			// Handle options for single_select
			if (parsedData.type === "single_select") {
				// Delete existing options
				await tx
					.delete(fieldOptions)
					.where(eq(fieldOptions.fieldId, parsedData.id));

				// Insert new options
				if (parsedData.options && parsedData.options.length > 0) {
					await tx.insert(fieldOptions).values(
						parsedData.options.map((opt) => ({
							fieldId: parsedData.id,
							value: opt,
						})),
					);
				}
			} else {
				// If type changed from single_select to something else, clear options strictly speaking not needed due to cascade but good for clarity if we kept options around.
				// Actually schema has cascade on delete field, but not on type change.
				// For now let's just delete options associated if any exists to be clean.
				await tx
					.delete(fieldOptions)
					.where(eq(fieldOptions.fieldId, parsedData.id));
			}
		});
	});

const ToggleFieldActiveInput = z.object({
	id: z.number().int(),
	active: z.boolean(),
});

export const toggleFieldActive = createServerFn({ method: "POST" })
	.inputValidator(ToggleFieldActiveInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, ToggleFieldActiveInput);

		await db
			.update(fields)
			.set({ active: parsedData.active })
			.where(eq(fields.id, parsedData.id));
	});

const GetFieldsInput = z.object({
	entityType: z.enum(entityType.enumValues, "Invalid entity type"),
});

export const getFieldResponses = createServerOnlyFn(
	async (type: (typeof entityType.enumValues)[number], entityId: number) => {
		const rows = await db
			.select({
				response: fieldResponses,
				field: fields,
			})
			.from(fieldResponses)
			.leftJoin(fields, eq(fieldResponses.fieldId, fields.id))
			.where(
				and(
					eq(fieldResponses.entityType, type),
					eq(fieldResponses.entityId, entityId),
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
				fieldId: row.field.id,
				fieldName: row.field.name,
				fieldType: row.field.type,
				value: row.response.value,
			}));
	},
);

const fetchFieldsFromDb = createServerOnlyFn(
	async (
		type: (typeof entityType.enumValues)[number],
		includeInactive = false,
	) => {
		const rows = await db
			.select({
				field: fields,
				option: fieldOptions,
			})
			.from(fields)
			.leftJoin(fieldOptions, eq(fields.id, fieldOptions.fieldId))
			.where(
				and(
					eq(fields.entityType, type),
					includeInactive ? undefined : eq(fields.active, true),
				),
			)
			.orderBy(asc(fields.order), fields.id);

		const fieldsAndOptions = rows.reduce((acc, row) => {
			let field = acc.find((f) => f.id === row.field.id);
			if (!field) {
				if (row.field.type === "single_select") {
					field = {
						...row.field,
						type: "single_select",
						options: [],
					};
				} else {
					field = { ...row.field } as Field;
				}
				acc.push(field);
			}

			if (row.option && field.type === "single_select") {
				field.options.push(row.option);
			}
			return acc;
		}, [] as Field[]);

		return fieldsAndOptions;
	},
);

export const getFields = createServerFn({ method: "GET" })
	.inputValidator(GetFieldsInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, GetFieldsInput);

		return await fetchFieldsFromDb(parsedData.entityType, true);
	});

export const getPublicRegistrationFields = createServerFn({
	method: "GET",
}).handler(async () => {
	return await fetchFieldsFromDb("registration", false);
});
