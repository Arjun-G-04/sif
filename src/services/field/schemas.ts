import * as z from "zod";
import {
	charLimitType,
	entityType,
	fieldStage,
	fieldType,
} from "../../db/schema";

export const CreateFieldInput = z
	.object({
		entityType: z.enum(entityType.enumValues, "Invalid entity type"),
		entityId: z.number().int().optional(),
		parentId: z.number().int().optional(),
		name: z.string().min(1, "Field name is required"),
		type: z.enum(fieldType.enumValues, "Invalid field type"),
		order: z.number().int().default(0),
		stage: z.enum(fieldStage.enumValues).default("initial"),
		required: z.boolean().default(true),
		charLimitType: z.enum(charLimitType.enumValues).optional().nullable(),
		charLimit: z
			.number()
			.int()
			.positive("Character count must be greater than 0")
			.optional()
			.nullable(),
		options: z.array(z.string()).optional(),
		relation: z
			.object({
				relatedEntityType: z.enum(
					entityType.enumValues,
					"Invalid related entity type",
				),
				relatedFieldId: z.number().int(),
			})
			.optional(),
		groupConfig: z
			.object({
				max: z.number().int().min(1).default(1),
			})
			.optional(),
		adminFileConfig: z
			.object({
				filePath: z.string(),
				originalName: z.string(),
			})
			.optional(),
	})
	.refine(
		(data) => {
			const hasType = Boolean(data.charLimitType);
			const hasLimit =
				typeof data.charLimit === "number" && data.charLimit > 0;
			if (hasType !== hasLimit) return false;
			if (hasType && data.type !== "text") return false;
			return true;
		},
		{
			message:
				"Both character limit type and limit must be provided for text fields",
			path: ["charLimit"],
		},
	);

export const UpdateFieldInput = z
	.object({
		id: z.number().int(),
		parentId: z.number().int().optional().nullable(),
		name: z.string().min(1, "Field name is required"),
		type: z.enum(fieldType.enumValues, "Invalid field type"),
		order: z.number().int().default(0),
		stage: z.enum(fieldStage.enumValues).default("initial"),
		required: z.boolean().default(true),
		charLimitType: z.enum(charLimitType.enumValues).optional().nullable(),
		charLimit: z
			.number()
			.int()
			.positive("Character count must be greater than 0")
			.optional()
			.nullable(),
		options: z.array(z.string()).optional(),
		relation: z
			.object({
				relatedEntityType: z.enum(
					entityType.enumValues,
					"Invalid related entity type",
				),
				relatedFieldId: z.number().int(),
			})
			.optional(),
		groupConfig: z
			.object({
				max: z.number().int().min(1).default(1),
			})
			.optional(),
		adminFileConfig: z
			.object({
				filePath: z.string(),
				originalName: z.string(),
			})
			.optional(),
	})
	.refine(
		(data) => {
			const hasType = Boolean(data.charLimitType);
			const hasLimit =
				typeof data.charLimit === "number" && data.charLimit > 0;
			if (hasType !== hasLimit) return false;
			if (hasType && data.type !== "text") return false;
			return true;
		},
		{
			message:
				"Both character limit type and limit must be provided for text fields",
			path: ["charLimit"],
		},
	);

export const ToggleFieldActiveInput = z.object({
	id: z.number().int(),
	active: z.boolean(),
});

export const GetFieldsInput = z.object({
	entityType: z.enum(entityType.enumValues, "Invalid entity type"),
	entityId: z.number().int().optional(),
	stage: z.enum(fieldStage.enumValues).optional(),
});

export const DeleteFieldInput = z.object({
	id: z.number().int(),
});
