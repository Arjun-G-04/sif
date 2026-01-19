import { db } from "@/db";
import { equipments, users } from "@/db/schema";
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

const CreateEquipmentInput = z.object({
	name: z.string().min(1, "Equipment name is required"),
	code: z.string().min(1, "Equipment code is required"),
});

export const createEquipment = createServerFn({ method: "POST" })
	.inputValidator(CreateEquipmentInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, CreateEquipmentInput);

		await db.insert(equipments).values(parsedData);
	});

const UpdateEquipmentInput = z.object({
	id: z.number().int(),
	name: z.string().min(1, "Equipment name is required"),
	code: z.string().min(1, "Equipment code is required"),
});

export const updateEquipment = createServerFn({ method: "POST" })
	.inputValidator(UpdateEquipmentInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsedData = safeParseAndThrow(data, UpdateEquipmentInput);

		await db
			.update(equipments)
			.set({
				name: parsedData.name,
				code: parsedData.code,
			})
			.where(eq(equipments.id, parsedData.id));
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
});

export const getEquipmentFields = createServerFn({ method: "GET" })
	.inputValidator(GetEquipmentFieldsInput)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const parsedData = safeParseAndThrow(data, GetEquipmentFieldsInput);

		// Fetch equipment fields
		const equipmentFields = await fetchFieldsFromDb(
			"equipment",
			false,
			parsedData.equipmentId,
		);

		const [dbUser] = await db
			.select({ regId: users.registrationId })
			.from(users)
			.where(eq(users.username, user.username))
			.limit(1);

		if (!dbUser || !dbUser.regId) {
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
