import { db } from "@/db";
import { bookings, equipments, fieldResponses, users } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { safeParseAndThrow } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { getFieldResponses, parseFieldResponses } from "./field";

export const submitBooking = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as FormData)
	.handler(async ({ data: formData }) => {
		const user = await requireUser();

		const equipmentIdRaw = formData.get("equipmentId");
		if (!equipmentIdRaw) {
			throw new Error("Equipment ID is required");
		}
		const equipmentId = Number.parseInt(equipmentIdRaw as string, 10);

		const [equipment] = await db
			.select()
			.from(equipments)
			.where(
				and(
					eq(equipments.id, equipmentId),
					eq(equipments.active, true),
				),
			)
			.limit(1);

		if (!equipment) {
			throw new Error("Equipment not found or inactive");
		}

		const [dbUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, user.username))
			.limit(1);

		if (!dbUser) {
			throw new Error("User not found");
		}

		const userId = dbUser.id;

		// Parse form data using the shared helper
		const fieldEntries = await parseFieldResponses(
			formData,
			"equipment",
			equipmentId,
			`bookings/${equipmentId}`,
			["equipmentId"],
		);

		// Create booking and insert responses in a transaction
		await db.transaction(async (tx) => {
			const [booking] = await tx
				.insert(bookings)
				.values({
					userId,
					equipmentId,
				})
				.returning({ id: bookings.id });

			if (fieldEntries.length > 0) {
				await tx.insert(fieldResponses).values(
					fieldEntries.map((entry) => ({
						entityType: "equipment" as const,
						entityId: equipmentId,
						userId,
						bookingId: booking.id,
						fieldId: entry.fieldId,
						iteration: entry.iteration,
						value: entry.value,
					})),
				);
			}

			return booking.id;
		});

		return { success: true };
	});

export const getBookings = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin();

		// Get all bookings with user and equipment info
		return await db
			.select({
				id: bookings.id,
				userId: bookings.userId,
				equipmentId: bookings.equipmentId,
				createdAt: bookings.createdAt,
				userEmail: users.username,
				equipmentName: equipments.name,
			})
			.from(bookings)
			.leftJoin(users, eq(bookings.userId, users.id))
			.leftJoin(equipments, eq(bookings.equipmentId, equipments.id));
	},
);

const GetBookingInput = z.object({
	bookingId: z.number(),
});

export const getBooking = createServerFn({ method: "GET" })
	.inputValidator(GetBookingInput)
	.handler(async ({ data }) => {
		await requireAdmin();

		const parsedData = safeParseAndThrow(data, GetBookingInput);
		const bookingId = parsedData.bookingId;

		const [booking] = await db
			.select({
				id: bookings.id,
				userId: bookings.userId,
				equipmentId: bookings.equipmentId,
				createdAt: bookings.createdAt,
				userEmail: users.username,
				equipmentName: equipments.name,
			})
			.from(bookings)
			.leftJoin(users, eq(bookings.userId, users.id))
			.leftJoin(equipments, eq(bookings.equipmentId, equipments.id))
			.where(eq(bookings.id, bookingId))
			.limit(1);

		if (!booking) {
			throw new Error("Booking not found");
		}

		// Get field responses associated with this booking
		const responses = await getFieldResponses(
			"equipment",
			booking.equipmentId,
			bookingId,
		);

		return {
			...booking,
			responses,
		};
	});
