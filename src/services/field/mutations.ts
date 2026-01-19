import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { saveUploadedFile } from "@/lib/files";
import { db } from "../../db";
import {
	fieldAdminFiles,
	fieldGroups,
	fieldOptions,
	fieldRelations,
	fields,
} from "../../db/schema";
import { requireAdmin } from "../../lib/auth";
import { safeParseAndThrow } from "../../lib/utils";
import {
	CreateFieldInput,
	ToggleFieldActiveInput,
	UpdateFieldInput,
} from "./schemas";

export const createField = createServerFn({ method: "POST" })
	.inputValidator(CreateFieldInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, CreateFieldInput);

		// Validate relation
		if (parsedData.type === "relation") {
			if (!parsedData.relation) {
				throw new Error(
					"Relation configuration is required for relation fields",
				);
			}
			// Enforce specific allowed relations (Equipment -> Registration)
			if (
				parsedData.entityType === "equipment" &&
				parsedData.relation.relatedEntityType !== "registration"
			) {
				throw new Error(
					"Equipments can only have relation fields to Registrations",
				);
			}
		}

		await db.transaction(async (tx) => {
			const [newField] = await tx
				.insert(fields)
				.values({
					entityType: parsedData.entityType,
					entityId: parsedData.entityId ?? undefined,
					parentId: parsedData.parentId ?? undefined,
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

			if (parsedData.type === "relation" && parsedData.relation) {
				await tx.insert(fieldRelations).values({
					fieldId: newField.id,
					relatedEntityType: parsedData.relation.relatedEntityType,
					relatedFieldId: parsedData.relation.relatedFieldId,
				});
			}

			if (parsedData.type === "group" && parsedData.groupConfig) {
				await tx.insert(fieldGroups).values({
					fieldId: newField.id,
					max: parsedData.groupConfig.max,
				});
			}

			if (
				parsedData.type === "admin_file" &&
				parsedData.adminFileConfig
			) {
				await tx.insert(fieldAdminFiles).values({
					fieldId: newField.id,
					filePath: parsedData.adminFileConfig.filePath,
					originalName: parsedData.adminFileConfig.originalName,
				});
			}
		});
	});

export const updateField = createServerFn({ method: "POST" })
	.inputValidator(UpdateFieldInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, UpdateFieldInput);

		// Validate relation
		if (parsedData.type === "relation") {
			if (!parsedData.relation) {
				throw new Error(
					"Relation configuration is required for relation fields",
				);
			}
			// To-do: Enforce specific allowed relations (Equipment -> Registration)
		}

		await db.transaction(async (tx) => {
			await tx
				.update(fields)
				.set({
					name: parsedData.name,
					type: parsedData.type,
					order: parsedData.order,
				})
				.where(eq(fields.id, parsedData.id));

			// Clean up all related tables first to handle type changes
			await tx
				.delete(fieldOptions)
				.where(eq(fieldOptions.fieldId, parsedData.id));
			await tx
				.delete(fieldRelations)
				.where(eq(fieldRelations.fieldId, parsedData.id));
			await tx
				.delete(fieldGroups)
				.where(eq(fieldGroups.fieldId, parsedData.id));
			await tx
				.delete(fieldAdminFiles)
				.where(eq(fieldAdminFiles.fieldId, parsedData.id));

			// Re-insert based on type
			if (parsedData.type === "single_select") {
				if (parsedData.options && parsedData.options.length > 0) {
					await tx.insert(fieldOptions).values(
						parsedData.options.map((opt) => ({
							fieldId: parsedData.id,
							value: opt,
						})),
					);
				}
			} else if (parsedData.type === "relation" && parsedData.relation) {
				await tx.insert(fieldRelations).values({
					fieldId: parsedData.id,
					relatedEntityType: parsedData.relation.relatedEntityType,
					relatedFieldId: parsedData.relation.relatedFieldId,
				});
			} else if (parsedData.type === "group" && parsedData.groupConfig) {
				await tx.insert(fieldGroups).values({
					fieldId: parsedData.id,
					max: parsedData.groupConfig.max,
				});
			} else if (
				parsedData.type === "admin_file" &&
				parsedData.adminFileConfig
			) {
				await tx.insert(fieldAdminFiles).values({
					fieldId: parsedData.id,
					filePath: parsedData.adminFileConfig.filePath,
					originalName: parsedData.adminFileConfig.originalName,
				});
			}
		});
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

export const uploadAdminFile = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as FormData)
	.handler(async ({ data: formData }) => {
		await requireAdmin();

		const file = formData.get("file");
		if (!file || !(file instanceof File)) {
			throw new Error("No file provided");
		}

		const { relativePath, originalName } = await saveUploadedFile({
			subPath: "admin_files",
			file,
		});

		return {
			filePath: relativePath,
			originalName,
		};
	});
