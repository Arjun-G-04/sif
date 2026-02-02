import * as z from "zod";
import { entityType, fieldStage, fieldType } from "../../db/schema";

export const CreateFieldInput = z.object({
	entityType: z.enum(entityType.enumValues, "Invalid entity type"),
	entityId: z.number().int().optional(),
	parentId: z.number().int().optional(),
	name: z.string().min(1, "Field name is required"),
	type: z.enum(fieldType.enumValues, "Invalid field type"),
	order: z.number().int().default(0),
	stage: z.enum(fieldStage.enumValues).default("initial"),
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
});

export const UpdateFieldInput = z.object({
	id: z.number().int(),
	name: z.string().min(1, "Field name is required"),
	type: z.enum(fieldType.enumValues, "Invalid field type"),
	order: z.number().int().default(0),
	stage: z.enum(fieldStage.enumValues).default("initial"),
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
});

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
