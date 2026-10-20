import { db } from "@/db";
import {
	bookings,
	configurations,
	equipments,
	fields,
	users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ISTEM_BASE_URL, getErrorMessage, istemFetch } from "@/lib/istem";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, gte, isNotNull, isNull, or, sql } from "drizzle-orm";
import * as z from "zod";
import {
	type SyncJobError,
	type SyncJobState,
	type SyncType,
	cancelSyncJob as cancelSyncJobWorker,
	clearSyncJob as clearSyncJobWorker,
	getSyncJobStatus as getSyncJobStatusWorker,
	startBackgroundSync,
} from "./istem-worker";

export type { SyncJobError, SyncJobState, SyncType };

// Authenticate server function
const AuthenticateInput = z.object({
	username: z.string().min(1, "Username required"),
	password: z.string().min(1, "Password required"),
});

export const authenticateIstem = createServerFn({ method: "POST" })
	.inputValidator(AuthenticateInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const { username, password } = data;

		const form = new URLSearchParams();
		form.append("username", username);
		form.append("password", password);

		let response: Awaited<ReturnType<typeof istemFetch>>;
		try {
			response = await istemFetch(`${ISTEM_BASE_URL}/auth/token`, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: form.toString(),
			});
		} catch (err) {
			throw new Error(
				`Failed to connect to I-STEM server: ${getErrorMessage(err)}`,
			);
		}

		const responseText = await response.text();

		if (!response.ok) {
			throw new Error(
				`Auth failed with status ${response.status}: ${responseText || response.statusText}`,
			);
		}

		let resData: {
			result?: string;
			message?: { access_token?: string; expires_in?: number } | string;
		};
		try {
			resData = JSON.parse(responseText);
		} catch {
			throw new Error(
				`Invalid JSON response received from I-STEM server: ${responseText}`,
			);
		}

		if (
			resData.result !== "SUCCESS" ||
			!resData.message ||
			typeof resData.message === "string" ||
			!resData.message.access_token
		) {
			const errorMsg =
				typeof resData.message === "string"
					? resData.message
					: "Invalid credentials or login failed.";
			throw new Error(errorMsg);
		}

		const token = resData.message.access_token;
		const expiresIn = resData.message.expires_in || 3600; // default 1h
		const expiresAt = new Date(Date.now() + expiresIn * 1000);

		// Store in Configurations table (id: 1)
		await db
			.insert(configurations)
			.values({
				id: 1,
				istemToken: token,
				istemTokenExpiresAt: expiresAt,
			})
			.onConflictDoUpdate({
				target: configurations.id,
				set: {
					istemToken: token,
					istemTokenExpiresAt: expiresAt,
				},
			});

		return { success: true, expiresAt };
	});

// Save configuration server function
const SaveConfigInput = z.object({
	userMapping: z.record(z.string(), z.string()),
	equipmentMapping: z.record(z.string(), z.string()),
	staticDefaults: z.record(z.string(), z.string()),
	bookingMappings: z.record(z.string(), z.record(z.string(), z.string())),
});

export const saveIstemConfig = createServerFn({ method: "POST" })
	.inputValidator(SaveConfigInput)
	.handler(async ({ data }) => {
		await requireAdmin();
		const parsed = data;

		await db
			.insert(configurations)
			.values({
				id: 1,
				istemUserMapping: parsed.userMapping,
				istemEquipmentMapping: parsed.equipmentMapping,
				istemStaticDefaults: parsed.staticDefaults,
			})
			.onConflictDoUpdate({
				target: configurations.id,
				set: {
					istemUserMapping: parsed.userMapping,
					istemEquipmentMapping: parsed.equipmentMapping,
					istemStaticDefaults: parsed.staticDefaults,
				},
			});

		// Save booking mappings per equipment
		for (const [eqIdStr, mapping] of Object.entries(
			parsed.bookingMappings,
		)) {
			const eqId = Number.parseInt(eqIdStr, 10);
			if (!Number.isNaN(eqId)) {
				await db
					.update(equipments)
					.set({
						istemBookingMapping: mapping,
					})
					.where(eq(equipments.id, eqId));
			}
		}

		return { success: true };
	});

// Get Sync Status
export const getSyncStatus = createServerFn({ method: "GET" }).handler(
	async () => {
		await requireAdmin();

		// 1. Get configurations
		const [config] = await db
			.select()
			.from(configurations)
			.where(eq(configurations.id, 1))
			.limit(1);

		const isAuthenticated = !!(
			config?.istemToken &&
			config?.istemTokenExpiresAt &&
			new Date() < new Date(config.istemTokenExpiresAt)
		);

		// 2. Fetch counts
		const [unsyncedUsersRes] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.where(
				and(
					eq(users.role, "public"),
					or(
						isNull(users.istemId),
						gt(users.updatedAt, users.istemSyncedAt),
					),
				),
			);

		const [syncedUsersRes] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.where(
				and(
					eq(users.role, "public"),
					isNotNull(users.istemId),
					gte(users.istemSyncedAt, users.updatedAt),
				),
			);

		const [unsyncedEquipmentsRes] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(equipments)
			.where(
				or(
					isNull(equipments.istemId),
					gt(equipments.updatedAt, equipments.istemSyncedAt),
				),
			);

		const [syncedEquipmentsRes] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(equipments)
			.where(
				and(
					isNotNull(equipments.istemId),
					gte(equipments.istemSyncedAt, equipments.updatedAt),
				),
			);

		const [unsyncedBookingsRes] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(bookings)
			.where(
				or(
					isNull(bookings.istemId),
					gt(bookings.updatedAt, bookings.istemSyncedAt),
				),
			);

		const [syncedBookingsRes] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(bookings)
			.where(
				and(
					isNotNull(bookings.istemId),
					gte(bookings.istemSyncedAt, bookings.updatedAt),
				),
			);

		// 3. Fetch local fields for mapping dropdowns
		const localFields = await db
			.select({
				id: fields.id,
				name: fields.name,
				entityType: fields.entityType,
				entityId: fields.entityId,
				stage: fields.stage,
			})
			.from(fields)
			.where(eq(fields.active, true));

		const userFields = localFields.filter(
			(f) => f.entityType === "registration",
		);
		const equipmentFields = localFields.filter(
			(f) => f.entityType === "equipment",
		);

		// 4. Fetch all equipments including their mapping
		const allEquipments = await db
			.select({
				id: equipments.id,
				name: equipments.name,
				code: equipments.code,
				istemBookingMapping: equipments.istemBookingMapping,
			})
			.from(equipments);

		return {
			isAuthenticated,
			tokenExpiresAt: config?.istemTokenExpiresAt || null,
			unsyncedUsersCount: unsyncedUsersRes?.count || 0,
			syncedUsersCount: syncedUsersRes?.count || 0,
			unsyncedEquipmentsCount: unsyncedEquipmentsRes?.count || 0,
			syncedEquipmentsCount: syncedEquipmentsRes?.count || 0,
			unsyncedBookingsCount: unsyncedBookingsRes?.count || 0,
			syncedBookingsCount: syncedBookingsRes?.count || 0,
			userFields,
			equipmentFields,
			equipments: allEquipments,
			config: {
				userMapping:
					(config?.istemUserMapping as Record<string, string>) || {},
				equipmentMapping:
					(config?.istemEquipmentMapping as Record<string, string>) ||
					{},
				staticDefaults:
					(config?.istemStaticDefaults as Record<string, string>) ||
					{},
			},
		};
	},
);

// 1. Sync Users (Starts background worker)
export const syncUsers = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		return await startBackgroundSync("users");
	},
);

// 2. Sync Equipments (Starts background worker)
export const syncEquipments = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		return await startBackgroundSync("equipments");
	},
);

// 3. Sync Bookings (Starts background worker)
export const syncBookings = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		return await startBackgroundSync("bookings");
	},
);

// 4. Query current background sync job status
export const getSyncJobStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<SyncJobState | null> => {
		await requireAdmin();
		return await getSyncJobStatusWorker();
	},
);

// 5. Cancel active sync job
export const cancelSyncJob = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		return await cancelSyncJobWorker();
	},
);

// 6. Dismiss / clear sync job record
export const clearSyncJob = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		return await clearSyncJobWorker();
	},
);
