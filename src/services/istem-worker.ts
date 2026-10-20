import { db } from "@/db";
import {
	bookings,
	configurations,
	equipments,
	fieldResponses,
	registrations,
	users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
	ISTEM_BASE_URL,
	formatToLocalIstemTime,
	getErrorMessage,
	istemFetch,
} from "@/lib/istem";
import { createServerOnlyFn } from "@tanstack/react-start";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getFieldResponses } from "./field/helpers";
import {
	BOOKING_API_FIELD_KEYS,
	BOOKING_FIELD_DEFS,
	EQUIPMENT_API_FIELD_KEYS,
	EQUIPMENT_FIELD_DEFS,
	USER_API_FIELD_KEYS,
	USER_FIELD_DEFS,
	type UserSyncRow,
	buildIstemFormData,
} from "./istem-fields";

export type SyncType = "users" | "equipments" | "bookings";

export interface SyncJobError {
	category: SyncType | "general";
	target: string;
	message: string;
}

export interface SyncJobState {
	id: string;
	type: SyncType;
	status: "idle" | "running" | "completed" | "failed" | "aborted";
	total: number;
	processed: number;
	successCount: number;
	failCount: number;
	errors: SyncJobError[];
	startedAt: string | null;
	completedAt: string | null;
}

interface IstemApiResponse {
	result?: string;
	status?: string;
	message?: string;
	error?: string;
	user_id?: string | number;
	id?: string | number;
	new_service_id?: string | number;
	data?: Array<{ user_id?: string | number; [key: string]: unknown }>;
}

declare global {
	var __istemActiveJob: SyncJobState | null | undefined;
	var __istemAbortController: AbortController | null | undefined;
	var __istemIsStarting: boolean | undefined;
}

function getActiveJob(): SyncJobState | null {
	return globalThis.__istemActiveJob || null;
}

function setActiveJob(job: SyncJobState | null) {
	globalThis.__istemActiveJob = job;
}

function getAbortController(): AbortController | null {
	return globalThis.__istemAbortController || null;
}

function setAbortController(controller: AbortController | null) {
	globalThis.__istemAbortController = controller;
}

let cachedIstemToken: { token: string; expiresAt: Date } | null = null;

async function getValidIstemToken(): Promise<string> {
	if (
		cachedIstemToken &&
		Date.now() + 60_000 < cachedIstemToken.expiresAt.getTime()
	) {
		return cachedIstemToken.token;
	}

	const [config] = await db
		.select()
		.from(configurations)
		.where(eq(configurations.id, 1))
		.limit(1);

	if (!config?.istemToken || !config.istemTokenExpiresAt) {
		throw new Error("I-STEM authentication missing. Please authenticate.");
	}

	const expiresAt = new Date(config.istemTokenExpiresAt);
	if (new Date() > expiresAt) {
		throw new Error(
			"I-STEM authentication expired. Please re-authenticate.",
		);
	}

	cachedIstemToken = { token: config.istemToken, expiresAt };
	return config.istemToken;
}

function assertIstemResponse(resData: IstemApiResponse, fallbackMsg: string) {
	const statusStr = String(
		resData.status || resData.result || "",
	).toLowerCase();
	if (statusStr !== "success" && statusStr !== "sucess") {
		throw new Error(resData.message || resData.error || fallbackMsg);
	}
}

// Generic Batch Sync Runner: handles lifecycle, aborts, and counts
async function runBatchSync<T>(
	category: SyncType,
	items: T[],
	signal: AbortSignal,
	getItemTarget: (item: T) => string,
	processItem: (item: T, token: string) => Promise<void>,
) {
	for (const item of items) {
		const job = getActiveJob();
		if (!job || signal.aborted) {
			if (job) {
				job.status = "aborted";
				job.completedAt = new Date().toISOString();
			}
			return;
		}

		try {
			const token = await getValidIstemToken();
			await processItem(item, token);
			if (job) job.successCount++;
		} catch (err) {
			if (signal.aborted) return;
			const target = getItemTarget(item);
			const rawError = getErrorMessage(err);
			if (job) {
				job.failCount++;
				job.errors.push({
					category,
					target,
					message: rawError,
				});
			}
		} finally {
			if (job && !signal.aborted) job.processed++;
		}
	}

	const job = getActiveJob();
	if (job && !signal.aborted && job.status === "running") {
		job.status = "completed";
		job.completedAt = new Date().toISOString();
	}
}

// User processor
async function syncUserItem(
	row: UserSyncRow,
	token: string,
	mapping: Record<string, string>,
	defaults: Record<string, string>,
	signal: AbortSignal,
) {
	const { user } = row;
	const [freshUser] = await db
		.select({ istemId: users.istemId, active: users.active })
		.from(users)
		.where(eq(users.id, user.id));

	if (!freshUser) {
		throw new Error("Record no longer exists in database.");
	}

	const isNew = !freshUser.istemId;
	const url = isNew
		? `${ISTEM_BASE_URL}/api/public-user`
		: `${ISTEM_BASE_URL}/api/public-user-update`;

	const responses = user.registrationId
		? await getFieldResponses("registration", user.registrationId)
		: [];

	const form = buildIstemFormData(USER_FIELD_DEFS, row, {
		responses,
		mapping,
		defaults,
		entityPrefix: "user",
	});

	form.append("user_status", freshUser.active ? "1" : "0");
	if (!isNew && freshUser.istemId) {
		form.append("id", freshUser.istemId);
	}

	const response = await istemFetch(url, {
		method: "POST",
		headers: {
			Token: token,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: form.toString(),
		signal,
	});

	if (!response.ok) {
		throw new Error(`I-STEM HTTP ${response.status}`);
	}

	const resData = (await response.json()) as IstemApiResponse;
	const msg = String(resData.message || "").toLowerCase();
	let newIstemId = resData.user_id
		? String(resData.user_id)
		: freshUser.istemId;

	if (
		isNew &&
		(msg.includes("already exists") || msg.includes("already exist")) &&
		resData.data?.[0]?.user_id
	) {
		newIstemId = String(resData.data[0].user_id);
	} else {
		assertIstemResponse(resData, "Sync failed on I-STEM");
	}

	if (isNew && !newIstemId) {
		throw new Error("Sync succeeded but user_id was not returned");
	}

	await db
		.update(users)
		.set({ istemId: newIstemId, istemSyncedAt: new Date() })
		.where(eq(users.id, user.id));
}

// Equipment processor
async function syncEquipmentItem(
	eqRow: typeof equipments.$inferSelect,
	token: string,
	mapping: Record<string, string>,
	defaults: Record<string, string>,
	signal: AbortSignal,
) {
	const [freshEq] = await db
		.select({ istemId: equipments.istemId, active: equipments.active })
		.from(equipments)
		.where(eq(equipments.id, eqRow.id));

	if (!freshEq) {
		throw new Error("Record no longer exists in database.");
	}

	const isNew = !freshEq.istemId;
	const url = isNew
		? `${ISTEM_BASE_URL}/api/equipment`
		: `${ISTEM_BASE_URL}/api/equipment-update`;

	const responses = await getFieldResponses("equipment", eqRow.id);
	const form = buildIstemFormData(EQUIPMENT_FIELD_DEFS, eqRow, {
		responses,
		mapping,
		defaults,
		entityPrefix: "equipment",
		localRecord: eqRow,
	});

	form.append("equipment_status", freshEq.active ? "Active" : "Inactive");
	if (!isNew && freshEq.istemId) {
		form.append("id", freshEq.istemId);
		form.append("ignore_facility_timings", "1");
	}

	const response = await istemFetch(url, {
		method: "POST",
		headers: {
			Token: token,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: form.toString(),
		signal,
	});

	if (!response.ok) {
		throw new Error(`I-STEM HTTP ${response.status}`);
	}

	const resData = (await response.json()) as IstemApiResponse;
	assertIstemResponse(resData, "Sync failed on I-STEM");

	const newIstemId = resData.id ? String(resData.id) : freshEq.istemId;
	if (isNew && !newIstemId) {
		throw new Error("Sync succeeded but equipment id was not returned");
	}

	if (!isNew && newIstemId) {
		const statusForm = new URLSearchParams();
		statusForm.append("id", newIstemId);
		statusForm.append("status", freshEq.active ? "Active" : "Inactive");
		statusForm.append("status_updated_by", "admin");
		statusForm.append(
			"status_updated_on",
			formatToLocalIstemTime(new Date()),
		);

		const statusRes = await istemFetch(
			`${ISTEM_BASE_URL}/api/equipment-status-update`,
			{
				method: "POST",
				headers: {
					Token: token,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: statusForm.toString(),
				signal,
			},
		);

		if (!statusRes.ok) {
			throw new Error(`Equipment status update HTTP ${statusRes.status}`);
		}
		const statusData = (await statusRes.json()) as IstemApiResponse;
		assertIstemResponse(
			statusData,
			"Equipment status update failed on I-STEM",
		);
	}

	await db
		.update(equipments)
		.set({ istemId: newIstemId, istemSyncedAt: new Date() })
		.where(eq(equipments.id, eqRow.id));
}

// Booking processor
async function syncBookingItem(
	row: {
		booking: typeof bookings.$inferSelect;
		user: typeof users.$inferSelect | null;
		equipment: typeof equipments.$inferSelect | null;
	},
	token: string,
	defaults: Record<string, string>,
	signal: AbortSignal,
) {
	const { booking, user, equipment } = row;
	if (!user?.istemId) {
		throw new Error(
			`Linked user (${user?.username ?? booking.userId}) not synced to I-STEM.`,
		);
	}
	if (!equipment?.istemId) {
		throw new Error(
			`Linked equipment (${equipment?.name ?? booking.equipmentId}) not synced to I-STEM.`,
		);
	}

	const [freshBooking] = await db
		.select({
			status: bookings.status,
			istemId: bookings.istemId,
			rejectionReason: bookings.rejectionReason,
			remarks: bookings.remarks,
		})
		.from(bookings)
		.where(eq(bookings.id, booking.id));

	if (!freshBooking) {
		throw new Error("Record no longer exists in database.");
	}

	const isNew = !freshBooking.istemId;
	const isCancelled =
		freshBooking.status === "rejected" ||
		freshBooking.status === "payment_rejected";

	if (isCancelled && !isNew && freshBooking.istemId) {
		const cancelForm = new URLSearchParams();
		cancelForm.append("request_id", freshBooking.istemId);
		cancelForm.append("cancelled_date", formatToLocalIstemTime(new Date()));
		cancelForm.append(
			"remarks",
			freshBooking.rejectionReason ||
				freshBooking.remarks ||
				"Cancelled locally",
		);
		cancelForm.append("cancelled", "true");
		cancelForm.append("cancelled_by", "admin");

		const cancelRes = await istemFetch(
			`${ISTEM_BASE_URL}/api/cancel-booking`,
			{
				method: "POST",
				headers: {
					Token: token,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: cancelForm.toString(),
				signal,
			},
		);

		const cancelData = (await cancelRes.json()) as IstemApiResponse;
		assertIstemResponse(cancelData, "Cancellation failed on I-STEM");

		await db
			.update(bookings)
			.set({ istemSyncedAt: new Date() })
			.where(eq(bookings.id, booking.id));
		return;
	}

	if (!isNew) {
		await db
			.update(bookings)
			.set({ istemSyncedAt: new Date() })
			.where(eq(bookings.id, booking.id));
		return;
	}

	const mapping =
		(equipment.istemBookingMapping as Record<string, string>) || {};
	const responses = await db
		.select({
			fieldId: fieldResponses.fieldId,
			value: fieldResponses.value,
		})
		.from(fieldResponses)
		.where(eq(fieldResponses.bookingId, booking.id));

	const form = buildIstemFormData(
		BOOKING_FIELD_DEFS,
		{ booking, user, equipment },
		{
			responses,
			mapping,
			defaults,
			entityPrefix: "booking",
			localRecord: booking,
		},
	);

	form.append("equipment_id", equipment.istemId);
	form.append("public_user_id", user.istemId);
	form.append(
		"request_date",
		formatToLocalIstemTime(new Date(booking.createdAt || Date.now())),
	);

	const response = await istemFetch(`${ISTEM_BASE_URL}/api/create-booking`, {
		method: "POST",
		headers: {
			Token: token,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: form.toString(),
		signal,
	});

	if (!response.ok) {
		throw new Error(`I-STEM HTTP ${response.status}`);
	}

	const resData = (await response.json()) as IstemApiResponse;
	assertIstemResponse(resData, "Creation failed on I-STEM");

	const rawId = resData.new_service_id || resData.id;
	if (isNew && !rawId) {
		throw new Error("Sync succeeded but booking id was not returned");
	}

	const newIstemId = rawId ? String(rawId) : booking.istemId;
	await db
		.update(bookings)
		.set({ istemId: newIstemId, istemSyncedAt: new Date() })
		.where(eq(bookings.id, booking.id));
}

// Declarative Sync Strategies
interface SyncStrategy<T> {
	validate: (
		config: typeof configurations.$inferSelect | undefined,
	) => Promise<void> | void;
	fetchUnsynced: () => Promise<T[]>;
	emptyMessage: string;
	getItemTarget: (item: T) => string;
	syncItem: (
		item: T,
		token: string,
		signal: AbortSignal,
		config: typeof configurations.$inferSelect | undefined,
	) => Promise<void>;
}

// biome-ignore lint/suspicious/noExplicitAny: polymorphic sync strategy dictionary
const SYNC_STRATEGIES: Record<SyncType, SyncStrategy<any>> = {
	users: {
		validate: (config) => {
			const mapping =
				(config?.istemUserMapping as Record<string, string>) || {};
			for (const key of USER_API_FIELD_KEYS) {
				if (!mapping[key] || mapping[key] === "default") {
					throw new Error(
						`Cannot sync users: User field mapping "${key}" is unmapped.`,
					);
				}
			}
		},
		fetchUnsynced: () =>
			db
				.select({
					user: users,
					registration: registrations,
				})
				.from(users)
				.leftJoin(
					registrations,
					eq(users.registrationId, registrations.id),
				)
				.where(
					and(
						eq(users.role, "public"),
						or(
							isNull(users.istemId),
							gt(users.updatedAt, users.istemSyncedAt),
						),
					),
				),
		emptyMessage: "No unsynced users found.",
		getItemTarget: (row: UserSyncRow) => {
			const regId = row.user.registrationId;
			const idPart = regId
				? `Registration No. #${regId}`
				: `User ID #${row.user.id}`;
			const emailPart = row.registration?.email
				? `, ${row.registration.email}`
				: "";
			return `${idPart} ("${row.user.username}"${emailPart})`;
		},
		syncItem: (row: UserSyncRow, token, signal, config) =>
			syncUserItem(
				row,
				token,
				(config?.istemUserMapping as Record<string, string>) || {},
				(config?.istemStaticDefaults as Record<string, string>) || {},
				signal,
			),
	},
	equipments: {
		validate: (config) => {
			const mapping =
				(config?.istemEquipmentMapping as Record<string, string>) || {};
			for (const key of EQUIPMENT_API_FIELD_KEYS) {
				if (!mapping[key] || mapping[key] === "default") {
					throw new Error(
						`Cannot sync equipments: Equipment field mapping "${key}" is unmapped.`,
					);
				}
			}
		},
		fetchUnsynced: () =>
			db
				.select()
				.from(equipments)
				.where(
					or(
						isNull(equipments.istemId),
						gt(equipments.updatedAt, equipments.istemSyncedAt),
					),
				),
		emptyMessage: "No unsynced equipments found.",
		getItemTarget: (eqRow: typeof equipments.$inferSelect) =>
			`Equipment Code: "${eqRow.code}" (ID #${eqRow.id}, "${eqRow.name}")`,
		syncItem: (
			eqRow: typeof equipments.$inferSelect,
			token,
			signal,
			config,
		) =>
			syncEquipmentItem(
				eqRow,
				token,
				(config?.istemEquipmentMapping as Record<string, string>) || {},
				(config?.istemStaticDefaults as Record<string, string>) || {},
				signal,
			),
	},
	bookings: {
		validate: async () => {
			const allEqs = await db.select().from(equipments);
			for (const eq of allEqs) {
				const eqMapping =
					(eq.istemBookingMapping as Record<string, string>) || {};
				for (const key of BOOKING_API_FIELD_KEYS) {
					if (!eqMapping[key] || eqMapping[key] === "default") {
						throw new Error(
							`Cannot sync bookings: Booking field mapping "${key}" is unmapped for equipment "${eq.name}".`,
						);
					}
				}
			}
		},
		fetchUnsynced: () =>
			db
				.select({
					booking: bookings,
					user: users,
					equipment: equipments,
				})
				.from(bookings)
				.leftJoin(users, eq(bookings.userId, users.id))
				.leftJoin(equipments, eq(bookings.equipmentId, equipments.id))
				.where(
					or(
						isNull(bookings.istemId),
						gt(bookings.updatedAt, bookings.istemSyncedAt),
					),
				),
		emptyMessage: "No unsynced bookings found.",
		getItemTarget: (row: {
			booking: typeof bookings.$inferSelect;
			user: typeof users.$inferSelect | null;
			equipment: typeof equipments.$inferSelect | null;
		}) => {
			const eqName =
				row.equipment?.name ?? `Equipment #${row.booking.equipmentId}`;
			const userName =
				row.user?.username ??
				(row.booking.userId
					? `User #${row.booking.userId}`
					: "Unknown User");
			return `Booking No. #${row.booking.id} ("${eqName}", User: "${userName}")`;
		},
		syncItem: (row, token, signal, config) =>
			syncBookingItem(
				row,
				token,
				(config?.istemStaticDefaults as Record<string, string>) || {},
				signal,
			),
	},
};

// Server-only exported background sync triggers
export const startBackgroundSync = createServerOnlyFn(
	async (
		type: SyncType,
	): Promise<{
		started: boolean;
		jobId?: string;
		total: number;
		message?: string;
	}> => {
		await requireAdmin();

		if (globalThis.__istemIsStarting) {
			throw new Error(
				"A sync operation is currently starting. Please wait.",
			);
		}

		const current = getActiveJob();
		if (current && current.status === "running") {
			throw new Error(
				"A sync operation is already running. Please wait or stop it first.",
			);
		}

		const strategy = SYNC_STRATEGIES[type];
		if (!strategy) {
			throw new Error(`Unknown sync type: ${type}`);
		}

		globalThis.__istemIsStarting = true;
		try {
			await getValidIstemToken();
			const [config] = await db
				.select()
				.from(configurations)
				.where(eq(configurations.id, 1))
				.limit(1);

			await strategy.validate(config);
			const items = await strategy.fetchUnsynced();

			if (items.length === 0) {
				return {
					started: false,
					total: 0,
					message: strategy.emptyMessage,
				};
			}

			const controller = new AbortController();
			setAbortController(controller);
			const newJob: SyncJobState = {
				id: Math.random().toString(36).substring(2, 9),
				type,
				status: "running",
				total: items.length,
				processed: 0,
				successCount: 0,
				failCount: 0,
				errors: [],
				startedAt: new Date().toISOString(),
				completedAt: null,
			};
			setActiveJob(newJob);

			runBatchSync(
				type,
				items,
				controller.signal,
				strategy.getItemTarget,
				(item, token) =>
					strategy.syncItem(item, token, controller.signal, config),
			).catch((err) => {
				console.error(`${type} sync failed:`, err);
				const job = getActiveJob();
				if (job) {
					job.status = "failed";
					job.completedAt = new Date().toISOString();
					job.errors.push({
						category: type,
						target: "Fatal Error",
						message: getErrorMessage(err),
					});
				}
			});

			return { started: true, jobId: newJob.id, total: newJob.total };
		} finally {
			globalThis.__istemIsStarting = false;
		}
	},
);

export const getSyncJobStatus = createServerOnlyFn(
	async (): Promise<SyncJobState | null> => {
		await requireAdmin();
		return getActiveJob();
	},
);

export const cancelSyncJob = createServerOnlyFn(
	async (): Promise<{ cancelled: boolean }> => {
		await requireAdmin();
		const current = getActiveJob();
		if (current && current.status === "running") {
			const controller = getAbortController();
			controller?.abort();
			current.status = "aborted";
			current.completedAt = new Date().toISOString();
			return { cancelled: true };
		}
		return { cancelled: false };
	},
);

export const clearSyncJob = createServerOnlyFn(
	async (): Promise<{ cleared: boolean; reason?: string }> => {
		await requireAdmin();
		const current = getActiveJob();
		if (!current) {
			return { cleared: true };
		}
		if (current.status === "running") {
			return {
				cleared: false,
				reason: "Cannot clear while sync is running",
			};
		}
		setActiveJob(null);
		return { cleared: true };
	},
);
