import { db } from "@/db";
import { equipments, fieldStage, users } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { safeParseAndThrow } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import { fetchFieldsFromDb, getFieldResponses } from "./field";

export type Equipment = typeof equipments.$inferSelect;

export const getAvailableEquipments = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireUser();
		return await db
			.select()
			.from(equipments)
			.where(eq(equipments.active, true))
			.orderBy(asc(equipments.name), equipments.id);
	},
);

export const getEquipments = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin();
		return await db
			.select()
			.from(equipments)
			.orderBy(asc(equipments.name), equipments.id);
	},
);

const GetEquipmentNameByIdInput = z.object({
	id: z.number().int(),
});

export const getEquipmentNameById = createServerFn({ method: "GET" })
	.inputValidator(GetEquipmentNameByIdInput)
	.handler(async ({ data }) => {
		await requireUser();
		const parsedData = safeParseAndThrow(data, GetEquipmentNameByIdInput);

		const [equipment] = await db
			.select({ name: equipments.name })
			.from(equipments)
			.where(eq(equipments.id, parsedData.id))
			.limit(1);

		return equipment.name ?? null;
	});

const trimmedString = z.string().trim().default("");

const urlValidator = z
	.string()
	.trim()
	.default("")
	.refine(
		(val) => {
			if (!val) return true;
			try {
				const url = new URL(val);
				return url.protocol === "http:" || url.protocol === "https:";
			} catch {
				return false;
			}
		},
		{
			message:
				"Invalid website URL format (must start with http:// or https://)",
		},
	);

const CreateEquipmentInput = z.object({
	name: z.string().trim().min(1, "Equipment name is required"),
	code: z.string().trim().min(1, "Equipment code is required"),
	make: trimmedString,
	model: trimmedString,
	departmentLab: trimmedString,
	usageRate: trimmedString,
	serialNumber: trimmedString,
	location: trimmedString,
	websiteUrl: urlValidator,
	description: trimmedString,
});

export const createEquipment = createServerFn({ method: "POST" })
	.inputValidator(CreateEquipmentInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, CreateEquipmentInput);

		await db.insert(equipments).values(parsedData);
	});

const UpdateEquipmentInput = CreateEquipmentInput.extend({
	id: z.number().int(),
});

export const updateEquipment = createServerFn({ method: "POST" })
	.inputValidator(UpdateEquipmentInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, UpdateEquipmentInput);
		const { id, ...updates } = parsedData;

		await db
			.update(equipments)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(equipments.id, id));
	});

const ToggleEquipmentActiveInput = z.object({
	id: z.number().int(),
	active: z.boolean(),
});

export const toggleEquipmentActive = createServerFn({ method: "POST" })
	.inputValidator(ToggleEquipmentActiveInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, ToggleEquipmentActiveInput);

		await db
			.update(equipments)
			.set({ active: parsedData.active })
			.where(eq(equipments.id, parsedData.id));
	});

const GetEquipmentFieldsInput = z.object({
	equipmentId: z.number().int(),
	stage: z.enum(fieldStage.enumValues).default("initial"),
});

export const getEquipmentFields = createServerFn({ method: "GET" })
	.inputValidator(GetEquipmentFieldsInput)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const parsedData = safeParseAndThrow(data, GetEquipmentFieldsInput);
		const stage = parsedData.stage ?? "initial";

		// Fetch global defaults and equipment-specific fields for the requested stage.
		const [defaultFields, equipmentSpecificFields] = await Promise.all([
			fetchFieldsFromDb("equipment", false, undefined, stage),
			fetchFieldsFromDb(
				"equipment",
				false,
				parsedData.equipmentId,
				stage,
			),
		]);
		const equipmentFields = [...defaultFields, ...equipmentSpecificFields];

		const [dbUser] = await db
			.select({ regId: users.registrationId })
			.from(users)
			.where(eq(users.username, user.username))
			.limit(1);

		if (!dbUser) {
			throw new Error("User not found");
		}

		const userRegId = dbUser.regId;

		// If user has a registration, fetch their registration responses for relation fields
		if (userRegId) {
			const registrationResponses = await getFieldResponses(
				"registration",
				userRegId,
			);

			// Map responses for easy lookup
			const responseMap = new Map(
				registrationResponses.map((r) => [r.fieldId, r.value]),
			);

			// Augment relation fields with the related value
			for (const field of equipmentFields) {
				if (
					field.type === "relation" &&
					field.relation &&
					field.relation.relatedEntityType === "registration"
				) {
					const relatedValue = responseMap.get(
						field.relation.relatedFieldId,
					);
					field.relatedValue = relatedValue;
				}
			}
		}

		return equipmentFields;
	});
