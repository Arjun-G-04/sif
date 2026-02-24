import { db } from "@/db";
import {
	bookings,
	equipments,
	fieldOptions,
	fieldResponses,
	fields,
	registrations,
	users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";

export const getAnalyticsData = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin();

		// Fetch all active equipments
		const allEquipments = await db
			.select({
				id: equipments.id,
				name: equipments.name,
			})
			.from(equipments)
			.where(eq(equipments.active, true));

		// Fetch all completed bookings with price
		const allBookings = await db
			.select({
				id: bookings.id,
				equipmentId: bookings.equipmentId,
				price: bookings.price,
				createdAt: bookings.createdAt,
				userId: bookings.userId,
				status: bookings.status,
			})
			.from(bookings)
			.where(eq(bookings.status, "completed"));

		// Fetch registration fields (single_select) for filtering
		const filterFields = await db
			.select({
				id: fields.id,
				name: fields.name,
			})
			.from(fields)
			.where(
				and(
					eq(fields.entityType, "registration"),
					eq(fields.type, "single_select"),
					eq(fields.active, true),
				),
			);

		const filterFieldIds = filterFields.map((f) => f.id);

		let fieldOptionsData: { fieldId: number; value: string }[] = [];
		let userFieldResponses: {
			userId: number;
			fieldId: number;
			value: string | null;
		}[] = [];

		if (filterFieldIds.length > 0) {
			// Fetch options for these fields
			fieldOptionsData = await db
				.select({
					fieldId: fieldOptions.fieldId,
					value: fieldOptions.value,
				})
				.from(fieldOptions)
				.where(inArray(fieldOptions.fieldId, filterFieldIds));

			// Fetch user responses for these fields
			// We need to link users -> registrations -> fieldResponses
			userFieldResponses = await db
				.select({
					userId: users.id,
					fieldId: fieldResponses.fieldId,
					value: fieldResponses.value,
				})
				.from(fieldResponses)
				.innerJoin(
					registrations,
					eq(fieldResponses.entityId, registrations.id),
				)
				.innerJoin(users, eq(registrations.id, users.registrationId))
				.where(
					and(
						eq(fieldResponses.entityType, "registration"),
						inArray(fieldResponses.fieldId, filterFieldIds),
					),
				);
		}

		return {
			equipments: allEquipments,
			bookings: allBookings,
			filterFields,
			fieldOptions: fieldOptionsData,
			userFieldResponses,
		};
	},
);
