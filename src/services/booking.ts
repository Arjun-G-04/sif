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
		return await db
			.select({
				id: bookings.id,
				userId: bookings.userId,
				equipmentId: bookings.equipmentId,
				createdAt: bookings.createdAt,
				status: bookings.status,
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
		const { bookingId } = safeParseAndThrow(data, GetBookingInput);

		const [booking] = await db
			.select({
				id: bookings.id,
				userId: bookings.userId,
				equipmentId: bookings.equipmentId,
				createdAt: bookings.createdAt,
				status: bookings.status,
				price: bookings.price,
				remarks: bookings.remarks,
				rejectionReason: bookings.rejectionReason,
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

		const responses = await getFieldResponses(
			"equipment",
			booking.equipmentId,
			bookingId,
		);

		return { ...booking, responses };
	});

export const updateBookingFields = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			responses: z.array(
				z.object({
					responseId: z.number(),
					adminValue: z.string().nullable(),
				}),
			),
		}),
	)
	.handler(async ({ data }) => {
		await requireAdmin();
		await db.transaction(async (tx) => {
			for (const resp of data.responses) {
				await tx
					.update(fieldResponses)
					.set({ adminValue: resp.adminValue })
					.where(eq(fieldResponses.id, resp.responseId));
			}
		});
		return { success: true };
	});

export const acceptBooking = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			bookingId: z.number(),
			price: z.number(),
			remarks: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await requireAdmin();
		await db
			.update(bookings)
			.set({
				status: "payment",
				price: data.price,
				remarks: data.remarks,
				rejectionReason: null,
			})
			.where(eq(bookings.id, data.bookingId));
		return { success: true };
	});

export const rejectBooking = createServerFn({ method: "POST" })
	.inputValidator(z.object({ bookingId: z.number(), reason: z.string() }))
	.handler(async ({ data }) => {
		await requireAdmin();
		await db
			.update(bookings)
			.set({ status: "rejected", rejectionReason: data.reason })
			.where(eq(bookings.id, data.bookingId));
		return { success: true };
	});

export const verifyBookingPayment = createServerFn({ method: "POST" })
	.inputValidator(z.object({ bookingId: z.number() }))
	.handler(async ({ data }) => {
		await requireAdmin();
		await db
			.update(bookings)
			.set({ status: "processing" })
			.where(eq(bookings.id, data.bookingId));
		return { success: true };
	});

export const completeBooking = createServerFn({ method: "POST" })
	.inputValidator(z.object({ bookingId: z.number() }))
	.handler(async ({ data }) => {
		await requireAdmin();
		await db
			.update(bookings)
			.set({ status: "completed" })
			.where(eq(bookings.id, data.bookingId));
		return { success: true };
	});

export const getUserBookings = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await requireUser();
		const [dbUser] = await db
			.select()
			.from(users)
			.where(eq(users.username, user.username))
			.limit(1);
		if (!dbUser) throw new Error("User not found");

		return await db
			.select({
				id: bookings.id,
				equipmentName: equipments.name,
				status: bookings.status,
				createdAt: bookings.createdAt,
			})
			.from(bookings)
			.leftJoin(equipments, eq(bookings.equipmentId, equipments.id))
			.where(eq(bookings.userId, dbUser.id));
	},
);

export const getUserBooking = createServerFn({ method: "GET" })
	.inputValidator(GetBookingInput)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const [dbUser] = await db
			.select()
			.from(users)
			.where(eq(users.username, user.username))
			.limit(1);
		if (!dbUser) throw new Error("User not found");

		const [booking] = await db
			.select({
				id: bookings.id,
				equipmentId: bookings.equipmentId,
				status: bookings.status,
				price: bookings.price,
				remarks: bookings.remarks,
				rejectionReason: bookings.rejectionReason,
				equipmentName: equipments.name,
				createdAt: bookings.createdAt,
			})
			.from(bookings)
			.leftJoin(equipments, eq(bookings.equipmentId, equipments.id))
			.where(
				and(
					eq(bookings.id, data.bookingId),
					eq(bookings.userId, dbUser.id),
				),
			)
			.limit(1);

		if (!booking) throw new Error("Booking not found");

		const responses = await getFieldResponses(
			"equipment",
			booking.equipmentId,
			booking.id,
		);
		return { ...booking, responses };
	});

export const submitBookingPaymentInfo = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => data as FormData)
	.handler(async ({ data: formData }) => {
		const user = await requireUser();
		const [dbUser] = await db
			.select()
			.from(users)
			.where(eq(users.username, user.username))
			.limit(1);
		if (!dbUser) throw new Error("User not found");

		const bookingIdRaw = formData.get("bookingId");
		if (!bookingIdRaw) throw new Error("Booking ID is required");
		const bookingId = Number.parseInt(bookingIdRaw as string, 10);

		const [booking] = await db
			.select()
			.from(bookings)
			.where(
				and(eq(bookings.id, bookingId), eq(bookings.userId, dbUser.id)),
			)
			.limit(1);

		if (!booking || booking.status !== "payment") {
			throw new Error("Invalid booking for payment info submission");
		}

		const fieldEntries = await parseFieldResponses(
			formData,
			"equipment",
			booking.equipmentId,
			`bookings/${booking.equipmentId}/payment`,
			["bookingId"],
		);

		if (fieldEntries.length > 0) {
			// Check if any of these fields already have responses for this booking
			const existingResponses = await db
				.select({ fieldId: fieldResponses.fieldId })
				.from(fieldResponses)
				.where(
					and(
						eq(fieldResponses.bookingId, booking.id),
						eq(fieldResponses.entityType, "equipment"),
					),
				);

			const existingFieldIds = new Set(
				existingResponses.map((r) => r.fieldId),
			);
			const newEntries = fieldEntries.filter(
				(entry) => !existingFieldIds.has(entry.fieldId),
			);

			if (newEntries.length === 0 && fieldEntries.length > 0) {
				throw new Error(
					"Information already submitted for these fields",
				);
			}

			if (newEntries.length > 0) {
				await db.insert(fieldResponses).values(
					newEntries.map((entry) => ({
						entityType: "equipment" as const,
						entityId: booking.equipmentId,
						userId: dbUser.id,
						bookingId: booking.id,
						fieldId: entry.fieldId,
						iteration: entry.iteration,
						value: entry.value,
					})),
				);
			}

			// Update booking status to payment_verification
			await db
				.update(bookings)
				.set({ status: "payment_verification" })
				.where(eq(bookings.id, booking.id));
		}

		return { success: true };
	});
