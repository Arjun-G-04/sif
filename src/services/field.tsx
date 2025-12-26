import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "../db";
import { fields, fieldOptions, entityType, fieldType } from "../db/schema";
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

const GetFieldsInput = z.object({
	entityType: z.enum(entityType.enumValues, "Invalid entity type"),
});

export const getFields = createServerFn({ method: "GET" })
	.inputValidator(GetFieldsInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, GetFieldsInput);

		const rows = await db
			.select({
				field: fields,
				option: fieldOptions,
			})
			.from(fields)
			.leftJoin(fieldOptions, eq(fields.id, fieldOptions.fieldId))
			.where(eq(fields.entityType, parsedData.entityType))
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
	});
