import { db } from "@/db";
import {
	bookings,
	equipments,
	fieldResponses,
	operatorEquipments,
	users,
} from "@/db/schema";
import { requireOfficeUser, requireUser } from "@/lib/auth";
import { safeParseAndThrow } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { getFieldResponses, parseFieldResponses } from "./field";
import { sendEmail } from "@/lib/email";
import { getConfigHelper } from "./configuration";
import { getRegistrationUserContext } from "./registration";

async function getOfficeActorContext() {
	const authUser = await requireOfficeUser();
	const [dbUser] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, authUser.username))
		.limit(1);

	if (!dbUser) {
		throw new Error("User not found");
	}

	return {
		authUser,
		dbUserId: dbUser.id,
	};
}

async function ensureBookingAccess(bookingId: number) {
	const actor = await getOfficeActorContext();

	if (actor.authUser.role === "admin") {
		const [booking] = await db
			.select({
				id: bookings.id,
				equipmentId: bookings.equipmentId,
				status: bookings.status,
				userId: bookings.userId,
				createdAt: bookings.createdAt,
			})
			.from(bookings)
			.where(eq(bookings.id, bookingId))
			.limit(1);

		if (!booking) {
			throw new Error("Booking not found");
		}

		return { ...actor, booking };
	}

	const [booking] = await db
		.select({
			id: bookings.id,
			equipmentId: bookings.equipmentId,
			status: bookings.status,
			userId: bookings.userId,
			createdAt: bookings.createdAt,
		})
		.from(bookings)
		.innerJoin(
			operatorEquipments,
			and(
				eq(operatorEquipments.equipmentId, bookings.equipmentId),
				eq(operatorEquipments.operatorId, actor.dbUserId),
			),
		)
		.where(eq(bookings.id, bookingId))
		.limit(1);

	if (!booking) {
		throw new Error("Booking not found");
	}

	return { ...actor, booking };
}

async function getBookingUserContext(bookingUserId: number) {
	const config = await getConfigHelper();
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, bookingUserId))
		.limit(1);

	let userName = "User";
	let userEmail: string | null = user?.username || null;

	if (user?.registrationId) {
		const regCtx = await getRegistrationUserContext(
			user.registrationId,
			config?.registrationNameFieldId,
		);
		userName = regCtx.userName;
		userEmail = regCtx.userEmail;
	}

	return { userName, userEmail };
}

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

		const fieldEntries = await parseFieldResponses(
			formData,
			"equipment",
			equipmentId,
			`bookings/${equipmentId}`,
			["equipmentId"],
			"initial",
		);

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
		const actor = await getOfficeActorContext();

		if (actor.authUser.role === "admin") {
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
		}

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
			.innerJoin(
				operatorEquipments,
				and(
					eq(operatorEquipments.equipmentId, bookings.equipmentId),
					eq(operatorEquipments.operatorId, actor.dbUserId),
				),
			)
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
		const { bookingId } = safeParseAndThrow(data, GetBookingInput);
		const actor = await ensureBookingAccess(bookingId);

		const [booking] = await db
			.select({
				id: bookings.id,
				userId: bookings.userId,
				equipmentId: bookings.equipmentId,
				createdAt: bookings.createdAt,
				status: bookings.status,
				price: bookings.price,
				gst: bookings.gst,
				remarks: bookings.remarks,
				rejectionReason: bookings.rejectionReason,
				userEmail: users.username,
				equipmentName: equipments.name,
			})
			.from(bookings)
			.leftJoin(users, eq(bookings.userId, users.id))
			.leftJoin(equipments, eq(bookings.equipmentId, equipments.id))
			.where(eq(bookings.id, actor.booking.id))
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

const UpdateBookingFieldsInput = z.object({
	bookingId: z.number(),
	responses: z.array(
		z.object({
			responseId: z.number(),
			adminValue: z.string().nullable(),
		}),
	),
});

export const updateBookingFields = createServerFn({ method: "POST" })
	.inputValidator(UpdateBookingFieldsInput)
	.handler(async ({ data }) => {
		const parsed = safeParseAndThrow(data, UpdateBookingFieldsInput);
		const access = await ensureBookingAccess(parsed.bookingId);
		await db.transaction(async (tx) => {
			for (const resp of parsed.responses) {
				await tx
					.update(fieldResponses)
					.set({ adminValue: resp.adminValue })
					.where(
						and(
							eq(fieldResponses.id, resp.responseId),
							eq(fieldResponses.bookingId, access.booking.id),
						),
					);
			}
		});
		return { success: true };
	});

const AcceptBookingInput = z.object({
	bookingId: z.number(),
	price: z.number(),
	gst: z.number(),
	remarks: z.string().optional(),
});

export const acceptBooking = createServerFn({ method: "POST" })
	.inputValidator(AcceptBookingInput)
	.handler(async ({ data }) => {
		const parsed = safeParseAndThrow(data, AcceptBookingInput);
		const access = await ensureBookingAccess(parsed.bookingId);
		await db
			.update(bookings)
			.set({
				status: "payment",
				price: parsed.price,
				gst: parsed.gst,
				remarks: parsed.remarks,
				rejectionReason: null,
			})
			.where(eq(bookings.id, access.booking.id));

		const { userName, userEmail } = await getBookingUserContext(
			access.booking.userId,
		);

		const bookingDate = access.booking.createdAt
			? new Date(access.booking.createdAt).toLocaleDateString("en-IN")
			: new Date().toLocaleDateString("en-IN");

		const totalAmount = parsed.price + parsed.gst;

		if (userEmail) {
			await sendEmail({
				to: userEmail,
				subject: "Booking Approved – Proceed with Payment",
				message: `Dear ${userName},

Your booking request (Booking ID: ${access.booking.id}) submitted on ${bookingDate} has been reviewed and approved by the SIF Office.

Kindly note that the testing charges applicable to your booking can be referred to in the SIF portal. Please proceed with the payment as per the details given below to confirm your slot.

Payment Details:
Payment Amount: ₹${totalAmount}
Payment Mode: SBI Collect

Payment Procedure: https://www.nitt.edu/home/rc/sif/payment_procedure/

After completing the payment, please upload the payment receipt in the SIF portal under your booking section and click “Submit”.

For any clarification, feel free to contact us at sif@nitt.edu/9489394853

Regards,
SIF Office
NIT Trichy`,
			});
		}

		return { success: true };
	});

const RejectBookingInput = z.object({
	bookingId: z.number(),
	reason: z.string(),
});

export const rejectBooking = createServerFn({ method: "POST" })
	.inputValidator(RejectBookingInput)
	.handler(async ({ data }) => {
		const parsed = safeParseAndThrow(data, RejectBookingInput);
		const access = await ensureBookingAccess(parsed.bookingId);

		const status =
			access.booking.status === "payment_verification"
				? "payment_rejected"
				: "rejected";

		await db
			.update(bookings)
			.set({ status, rejectionReason: parsed.reason })
			.where(eq(bookings.id, access.booking.id));
		return { success: true };
	});

const VerifyBookingPaymentInput = z.object({
	bookingId: z.number(),
});

export const verifyBookingPayment = createServerFn({ method: "POST" })
	.inputValidator(VerifyBookingPaymentInput)
	.handler(async ({ data }) => {
		const parsed = safeParseAndThrow(data, VerifyBookingPaymentInput);
		const access = await ensureBookingAccess(parsed.bookingId);
		await db
			.update(bookings)
			.set({ status: "processing" })
			.where(eq(bookings.id, access.booking.id));

		const { userName, userEmail } = await getBookingUserContext(
			access.booking.userId,
		);

		if (userEmail) {
			await sendEmail({
				to: userEmail,
				subject: "Booking Confirmed – Testing in Progress",
				message: `Dear ${userName},

This is to inform you that your booking (Booking ID: ${access.booking.id}) has been successfully confirmed.

Your request is currently being processed, and the testing activities will be carried out as per the approved schedule. You will be intimated once the testing is completed and the results are ready.

Thank you for choosing the Sophisticated Instrumentation Facility (SIF).

If you need any assistance, please feel free to contact us at sif@nitt.edu/9489394853

Warm regards,
SIF Office
NIT Trichy`,
			});
		}

		return { success: true };
	});

const CompleteBookingInput = z.object({
	bookingId: z.number(),
});

export const completeBooking = createServerFn({ method: "POST" })
	.inputValidator(CompleteBookingInput)
	.handler(async ({ data }) => {
		const parsed = safeParseAndThrow(data, CompleteBookingInput);
		const access = await ensureBookingAccess(parsed.bookingId);
		await db
			.update(bookings)
			.set({ status: "completed" })
			.where(eq(bookings.id, access.booking.id));

		const { userName, userEmail } = await getBookingUserContext(
			access.booking.userId,
		);

		if (userEmail) {
			await sendEmail({
				to: userEmail,
				subject: "Test Completed – Results Available",
				message: `Dear ${userName},

We are pleased to inform you that the testing for your booking (Booking ID: ${access.booking.id}) has been successfully completed and officially closed in the SIF Portal.

The test results/report have been shared to your registered email ID. If you require any clarification regarding the results, please feel free to contact the SIF Office.

We sincerely thank you for utilizing the Sophisticated Instrumentation Facility (SIF) services. Your feedback is valuable to us and helps us improve our services. We kindly request you to take a moment to rate & review us at: https://share.google/RVDgqzE5SGI5Wg4Na

Give your feedback here: https://forms.gle/F8GCdVHsQAB3q5heA

We look forward to supporting your future research and testing requirements.

Warm regards,
SIF Office
NIT Trichy`,
			});
		}

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
				gst: bookings.gst,
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
			"payment",
		);

		if (fieldEntries.length > 0) {
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

			await db
				.update(bookings)
				.set({ status: "payment_verification" })
				.where(eq(bookings.id, booking.id));
		}

		return { success: true };
	});
