import { db } from "@/db";
import {
	bookings,
	configurations,
	equipments,
	fields,
	fieldResponses,
	registrations,
	users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, gte, isNull, isNotNull, or, sql } from "drizzle-orm";
import * as z from "zod";
import { getFieldResponses } from "./field/helpers";

const ISTEM_BASE_URL = "https://istemstaging.iisc.ac.in/istem1";

// Helper to check token validity and return it
async function getValidIstemToken() {
	const [config] = await db
		.select()
		.from(configurations)
		.where(eq(configurations.id, 1))
		.limit(1);

	if (!config || !config.istemToken || !config.istemTokenExpiresAt) {
		throw new Error("I-STEM authentication missing. Please authenticate.");
	}

	if (new Date() > new Date(config.istemTokenExpiresAt)) {
		throw new Error(
			"I-STEM authentication expired. Please re-authenticate.",
		);
	}

	return config.istemToken;
}

// Helper to format Date into Asia/Kolkata (IST) timezone formatted string "YYYY-MM-DD HH:mm:ss"
function formatToLocalIstemTime(date: Date): string {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Kolkata",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	const parts = formatter.formatToParts(date);
	const r = (type: string) => parts.find((p) => p.type === type)?.value;
	return `${r("year")}-${r("month")}-${r("day")} ${r("hour")}:${r("minute")}:${r("second")}`;
}

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

		const response = await fetch(`${ISTEM_BASE_URL}/auth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: form.toString(),
		});

		if (!response.ok) {
			throw new Error(`Auth failed with status ${response.status}`);
		}

		const resData = await response.json();
		if (resData.result !== "SUCCESS" || !resData.message?.access_token) {
			throw new Error(
				resData.message || "Invalid credentials or login failed.",
			);
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

// Helper to resolve mapped values
function resolveFieldValue(
	fieldResponses: Array<{ fieldId: number; value: string | null }>,
	mapping: Record<string, string>,
	defaults: Record<string, string>,
	apiKey: string,
	fallbackLocalValue?: string | null,
	entityPrefix?: string,
	// biome-ignore lint/suspicious/noExplicitAny: localRecord can be any DB record (equipment, booking, etc.)
	localRecord?: Record<string, any>,
) {
	const mappedFieldId = mapping[apiKey];
	const staticKey = entityPrefix ? `${entityPrefix}_${apiKey}` : apiKey;

	if (mappedFieldId === "static") {
		return defaults[staticKey] || "-";
	}
	if (entityPrefix === "equipment" && localRecord) {
		if (mappedFieldId === "name") return localRecord.name || "-";
		if (mappedFieldId === "code") return localRecord.code || "-";
		if (mappedFieldId === "active")
			return localRecord.active ? "Active" : "Inactive";
	}
	if (mappedFieldId && mappedFieldId !== "default") {
		const response = fieldResponses.find(
			(r) => String(r.fieldId) === mappedFieldId,
		);
		if (response?.value) return response.value;
	}
	if (fallbackLocalValue) return fallbackLocalValue;
	return defaults[staticKey] || "-";
}

const USER_API_FIELD_KEYS = [
	"user_first_name",
	"user_last_name",
	"user_email",
	"user_contactno",
	"user_organisation",
	"billing_user_name",
	"billing_address",
	"user_gender",
	"user_salutation",
	"user_address",
	"user_city",
	"user_district",
	"user_state",
	"user_country",
	"user_pin",
	"institute_id",
	"user_type",
];

const EQUIPMENT_API_FIELD_KEYS = [
	"equipment_name",
	"equipment_make",
	"equipment_model",
	"equipment_dept_lab",
	"equipment_rate",
	"equipment_srno",
	"equipment_location",
	"equipment_website",
	"equipment_description",
	"institute_id",
];

const BOOKING_API_FIELD_KEYS = [
	"service_type",
	"billing_state",
	"billing_address",
	"booking_remark",
	"booking_title",
	"background_of_work",
	"exclusive_use",
];

// 1. Sync Users
export const syncUsers = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		const token = await getValidIstemToken();

		const [config] = await db
			.select()
			.from(configurations)
			.where(eq(configurations.id, 1))
			.limit(1);
		const mapping =
			(config?.istemUserMapping as Record<string, string>) || {};
		const defaults =
			(config?.istemStaticDefaults as Record<string, string>) || {};

		// Enforce no unmapped fields
		for (const key of USER_API_FIELD_KEYS) {
			if (!mapping[key] || mapping[key] === "default") {
				throw new Error(
					`Cannot sync users: User field mapping "${key}" is unmapped. Please configure all user field mappings.`,
				);
			}
		}

		// Fetch unsynced users
		const unsyncedUsers = await db
			.select({
				user: users,
				registration: registrations,
			})
			.from(users)
			.leftJoin(registrations, eq(users.registrationId, registrations.id))
			.where(
				and(
					eq(users.role, "public"),
					or(
						isNull(users.istemId),
						gt(users.updatedAt, users.istemSyncedAt),
					),
				),
			);

		let successCount = 0;
		let failCount = 0;
		const errors: string[] = [];

		for (const row of unsyncedUsers) {
			try {
				const { user, registration } = row;
				if (!registration) {
					throw new Error(
						`User ${user.username} has no linked registration.`,
					);
				}

				// Get user responses
				const responses = await getFieldResponses(
					"registration",
					registration.id,
				);

				// Map I-STEM API fields
				const isNew = !user.istemId;
				const url = isNew
					? `${ISTEM_BASE_URL}/api/public-user`
					: `${ISTEM_BASE_URL}/api/public-user-update`;

				const form = new URLSearchParams();
				form.append(
					"user_first_name",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_first_name",
						null,
						"user",
					),
				);
				form.append(
					"user_last_name",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_last_name",
						null,
						"user",
					),
				);
				form.append(
					"user_email",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_email",
						registration.email,
						"user",
					),
				);
				form.append(
					"user_contactno",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_contactno",
						registration.phone,
						"user",
					),
				);
				form.append(
					"user_organisation",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_organisation",
						null,
						"user",
					),
				);
				form.append(
					"billing_user_name",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"billing_user_name",
						null,
						"user",
					),
				);
				form.append(
					"billing_address",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"billing_address",
						null,
						"user",
					),
				);
				form.append(
					"institute_id",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"institute_id",
						null,
						"user",
					),
				);
				form.append(
					"user_type",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_type",
						"Academic User",
						"user",
					),
				);
				form.append(
					"user_gender",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_gender",
						"Male",
						"user",
					),
				);
				form.append(
					"user_salutation",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_salutation",
						"Prof.",
						"user",
					),
				);
				form.append(
					"user_address",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_address",
						null,
						"user",
					),
				);
				form.append(
					"user_city",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_city",
						null,
						"user",
					),
				);
				form.append(
					"user_district",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_district",
						null,
						"user",
					),
				);
				form.append(
					"user_state",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_state",
						null,
						"user",
					),
				);
				form.append(
					"user_country",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_country",
						"India",
						"user",
					),
				);
				form.append(
					"user_pin",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_pin",
						null,
						"user",
					),
				);
				form.append("user_status", user.active ? "1" : "0");

				if (!isNew && user.istemId) {
					form.append("id", user.istemId);
				}

				const response = await fetch(url, {
					method: "POST",
					headers: {
						Token: token,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: form.toString(),
				});

				if (!response.ok) {
					throw new Error(
						`I-STEM server responded with status ${response.status}`,
					);
				}

				const resData = await response.json();
				const statusStr = String(resData.status || "").toLowerCase();
				if (statusStr !== "success" && statusStr !== "sucess") {
					throw new Error(
						resData.message ||
							resData.error ||
							"I-STEM Sync Failed",
					);
				}

				const newIstemId = resData.user_id
					? String(resData.user_id)
					: user.istemId;

				if (isNew && !newIstemId) {
					throw new Error(
						"I-STEM sync succeeded but user_id was not returned",
					);
				}

				await db
					.update(users)
					.set({
						istemId: newIstemId,
						istemSyncedAt: new Date(),
					})
					.where(eq(users.id, user.id));

				successCount++;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : String(err);
				failCount++;
				errors.push(`User ID ${row.user.id}: ${errorMessage}`);
			}
		}

		return { successCount, failCount, errors };
	},
);

// 2. Sync Equipments
export const syncEquipments = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		const token = await getValidIstemToken();

		const [config] = await db
			.select()
			.from(configurations)
			.where(eq(configurations.id, 1))
			.limit(1);
		const mapping =
			(config?.istemEquipmentMapping as Record<string, string>) || {};
		const defaults =
			(config?.istemStaticDefaults as Record<string, string>) || {};

		// Enforce no unmapped fields
		for (const key of EQUIPMENT_API_FIELD_KEYS) {
			if (!mapping[key] || mapping[key] === "default") {
				throw new Error(
					`Cannot sync equipments: Equipment field mapping "${key}" is unmapped. Please configure all equipment field mappings.`,
				);
			}
		}

		// Ensure users are fully synced first
		const [unsyncedUsers] = await db
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

		if (unsyncedUsers && unsyncedUsers.count > 0) {
			throw new Error(
				"Cannot sync equipments. Unsynced users must be synced first.",
			);
		}

		const unsyncedEquipments = await db
			.select()
			.from(equipments)
			.where(
				or(
					isNull(equipments.istemId),
					gt(equipments.updatedAt, equipments.istemSyncedAt),
				),
			);

		let successCount = 0;
		let failCount = 0;
		const errors: string[] = [];

		for (const eqRow of unsyncedEquipments) {
			try {
				const responses = await getFieldResponses(
					"equipment",
					eqRow.id,
				);

				const isNew = !eqRow.istemId;
				const url = isNew
					? `${ISTEM_BASE_URL}/api/equipment`
					: `${ISTEM_BASE_URL}/api/equipment-update`;

				const form = new URLSearchParams();
				form.append(
					"equipment_name",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_name",
						eqRow.name,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_make",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_make",
						null,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_model",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_model",
						null,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_dept_lab",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_dept_lab",
						null,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_status",
					eqRow.active ? "Active" : "Inactive",
				);
				form.append(
					"institute_id",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"institute_id",
						null,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_rate",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_rate",
						"10.00",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_srno",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_srno",
						eqRow.code,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_facility_id",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_facility_id",
						"1",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_department_id",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_department_id",
						"1",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_compatibility",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_compatibility",
						"Compatible",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_cost",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_cost",
						"100",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_uom",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_uom",
						"Hour",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_agency_id",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_agency_id",
						"109",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"funding_agency_type",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"funding_agency_type",
						"External Funding",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"category",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"category",
						"Fabrication",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_abbr",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_abbr",
						eqRow.code,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_location",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_location",
						null,
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_website",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_website",
						"http://example.com",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_project_id",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_project_id",
						"0",
						"equipment",
						eqRow,
					),
				);
				form.append(
					"equipment_description",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_description",
						`Local equipment: ${eqRow.name}`,
						"equipment",
						eqRow,
					),
				);

				if (!isNew && eqRow.istemId) {
					form.append("id", eqRow.istemId);
				}

				// Add status_updated_by and status_updated_on if not isNew
				if (!isNew) {
					form.append("ignore_facility_timings", "1");
				}

				const response = await fetch(url, {
					method: "POST",
					headers: {
						Token: token,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: form.toString(),
				});

				if (!response.ok) {
					throw new Error(
						`I-STEM server responded with status ${response.status}`,
					);
				}

				const resData = await response.json();
				const statusStr = String(resData.status || "").toLowerCase();
				if (statusStr !== "success" && statusStr !== "sucess") {
					throw new Error(
						resData.message ||
							resData.error ||
							"I-STEM Sync Failed",
					);
				}

				const newIstemId = resData.id
					? String(resData.id)
					: eqRow.istemId;

				if (isNew && !newIstemId) {
					throw new Error(
						"I-STEM sync succeeded but equipment id was not returned",
					);
				}

				// If local equipment status is Inactive, make a separate status-update call as I-STEM update API might not apply status
				if (!isNew && newIstemId) {
					const statusForm = new URLSearchParams();
					statusForm.append("id", newIstemId);
					statusForm.append(
						"status",
						eqRow.active ? "Active" : "Inactive",
					);
					statusForm.append("status_updated_by", "admin"); // Fallback
					statusForm.append(
						"status_updated_on",
						formatToLocalIstemTime(new Date()),
					);

					await fetch(
						`${ISTEM_BASE_URL}/api/equipment-status-update`,
						{
							method: "POST",
							headers: {
								Token: token,
								"Content-Type":
									"application/x-www-form-urlencoded",
							},
							body: statusForm.toString(),
						},
					);
				}

				await db
					.update(equipments)
					.set({
						istemId: newIstemId,
						istemSyncedAt: new Date(),
					})
					.where(eq(equipments.id, eqRow.id));

				successCount++;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : String(err);
				failCount++;
				errors.push(`Equipment ID ${eqRow.id}: ${errorMessage}`);
			}
		}

		return { successCount, failCount, errors };
	},
);

// 3. Sync Bookings
export const syncBookings = createServerFn({ method: "POST" }).handler(
	async () => {
		await requireAdmin();
		const token = await getValidIstemToken();

		const [config] = await db
			.select()
			.from(configurations)
			.where(eq(configurations.id, 1))
			.limit(1);
		const defaults =
			(config?.istemStaticDefaults as Record<string, string>) || {};

		// Enforce that booking mapping is configured for ALL equipments
		const allEqs = await db.select().from(equipments);
		for (const eq of allEqs) {
			const eqMapping =
				(eq.istemBookingMapping as Record<string, string>) || {};
			for (const key of BOOKING_API_FIELD_KEYS) {
				if (!eqMapping[key] || eqMapping[key] === "default") {
					throw new Error(
						`Cannot sync bookings: Booking field mapping "${key}" is unmapped for equipment "${eq.name}". Please configure booking mappings for all equipments.`,
					);
				}
			}
		}

		// Enforce users and equipments are synced first
		const [unsyncedUsers] = await db
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

		const [unsyncedEquipments] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(equipments)
			.where(
				or(
					isNull(equipments.istemId),
					gt(equipments.updatedAt, equipments.istemSyncedAt),
				),
			);

		if (
			(unsyncedUsers && unsyncedUsers.count > 0) ||
			(unsyncedEquipments && unsyncedEquipments.count > 0)
		) {
			throw new Error(
				"Cannot sync bookings. Unsynced users and equipments must be synced first.",
			);
		}

		// Fetch unsynced bookings
		const unsyncedBookings = await db
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
			);

		let successCount = 0;
		let failCount = 0;
		const errors: string[] = [];

		for (const row of unsyncedBookings) {
			try {
				const { booking, user, equipment } = row;
				if (!user || !user.istemId) {
					throw new Error("Linked user is not synced to I-STEM.");
				}
				if (!equipment || !equipment.istemId) {
					throw new Error(
						"Linked equipment is not synced to I-STEM.",
					);
				}

				const mapping =
					(equipment.istemBookingMapping as Record<string, string>) ||
					{};

				// Get responses for this booking (from fieldResponses where bookingId matches)
				const responses = await db
					.select({
						fieldId: fieldResponses.fieldId,
						value: fieldResponses.value,
					})
					.from(fieldResponses)
					.where(eq(fieldResponses.bookingId, booking.id));

				const isNew = !booking.istemId;
				const isCancelled =
					booking.status === "rejected" ||
					booking.status === "payment_rejected";

				if (isCancelled && !isNew && booking.istemId) {
					// Propagate cancellation
					const cancelForm = new URLSearchParams();
					cancelForm.append("request_id", booking.istemId);
					cancelForm.append(
						"cancelled_date",
						formatToLocalIstemTime(new Date()),
					);
					cancelForm.append(
						"remarks",
						booking.rejectionReason ||
							booking.remarks ||
							"Cancelled locally",
					);
					cancelForm.append("cancelled", "true");
					cancelForm.append("cancelled_by", "admin");

					const cancelRes = await fetch(
						`${ISTEM_BASE_URL}/api/cancel-booking`,
						{
							method: "POST",
							headers: {
								Token: token,
								"Content-Type":
									"application/x-www-form-urlencoded",
							},
							body: cancelForm.toString(),
						},
					);

					const cancelData = await cancelRes.json();
					const cancelStatusStr = String(
						cancelData.status || "",
					).toLowerCase();
					if (
						cancelStatusStr !== "success" &&
						cancelStatusStr !== "sucess"
					) {
						throw new Error(
							cancelData.message ||
								cancelData.error ||
								"Failed to cancel booking on I-STEM",
						);
					}

					await db
						.update(bookings)
						.set({
							istemSyncedAt: new Date(),
						})
						.where(eq(bookings.id, booking.id));

					successCount++;
					continue;
				}

				// Skip creation if already synced and we only want to cancel it (not update other booking fields, as no booking edit endpoint exists except rescheduling)
				if (!isNew) {
					// reschedules if necessary
					continue;
				}

				// Format request parameters for creation
				const form = new URLSearchParams();
				form.append("equipment_id", equipment.istemId);
				form.append("public_user_id", user.istemId);

				const defaultFrom = formatToLocalIstemTime(
					new Date(Date.now() + 24 * 3600 * 1000),
				);
				const defaultTo = formatToLocalIstemTime(
					new Date(Date.now() + 25 * 3600 * 1000),
				);

				form.append(
					"preferred_timings_from",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"preferred_timings_from",
						defaultFrom,
						"booking",
						booking,
					),
				);
				form.append(
					"preferred_timings_to",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"preferred_timings_to",
						defaultTo,
						"booking",
						booking,
					),
				);
				form.append(
					"service_type",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"service_type",
						"Fabrication",
						"booking",
						booking,
					),
				);
				form.append(
					"remarks",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"remarks",
						booking.remarks || "Sync booking",
						"booking",
						booking,
					),
				);
				form.append(
					"booking_by",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"booking_by",
						user.username,
						"booking",
						booking,
					),
				);
				form.append(
					"billing_user_name",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"billing_user_name",
						user.username,
						"booking",
						booking,
					),
				);
				form.append(
					"billing_address",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"billing_address",
						"NIT Tiruchirappalli",
						"booking",
						booking,
					),
				);
				form.append(
					"billing_state",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"billing_state",
						"Tamil Nadu",
						"booking",
						booking,
					),
				);
				form.append(
					"req_unit",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"req_unit",
						"1:00",
						"booking",
						booking,
					),
				);
				form.append(
					"request_date",
					formatToLocalIstemTime(
						new Date(booking.createdAt || Date.now()),
					),
				);
				form.append(
					"booking_remark",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"booking_remark",
						"Local SIF Booking",
						"booking",
						booking,
					),
				);
				form.append(
					"booking_title",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"booking_title",
						`Booking for ${equipment.name}`,
						"booking",
						booking,
					),
				);
				form.append(
					"bk_natsamp",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"bk_natsamp",
						"Test",
						"booking",
						booking,
					),
				);
				form.append(
					"bk_tecinf",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"bk_tecinf",
						"Test",
						"booking",
						booking,
					),
				);
				form.append(
					"bk_speinf",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"bk_speinf",
						"Test",
						"booking",
						booking,
					),
				);
				form.append(
					"total_est_amt",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"total_est_amt",
						String(booking.price || "100"),
						"booking",
						booking,
					),
				);
				form.append(
					"eq_rate",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"eq_rate",
						"100",
						"booking",
						booking,
					),
				);
				form.append(
					"usage_type",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"usage_type",
						"industry",
						"booking",
						booking,
					),
				);
				form.append(
					"background_of_work",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"background_of_work",
						"Research",
						"booking",
						booking,
					),
				);
				form.append(
					"booking_no_sample",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"booking_no_sample",
						"01:00",
						"booking",
						booking,
					),
				);
				form.append(
					"gstin",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"gstin",
						"123245",
						"booking",
						booking,
					),
				);
				form.append(
					"equipment_uom",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"equipment_uom",
						"Hour",
						"booking",
						booking,
					),
				);
				form.append(
					"analysis_type",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"analysis_type",
						"Hour",
						"booking",
						booking,
					),
				);
				form.append(
					"addl_amt",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"addl_amt",
						"0",
						"booking",
						booking,
					),
				);
				form.append(
					"working_hrs",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"working_hrs",
						"1",
						"booking",
						booking,
					),
				);
				form.append(
					"exclusive_use",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"exclusive_use",
						"test",
						"booking",
						booking,
					),
				);
				form.append(
					"consumables_provided by",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"consumables_provided by",
						"Institution Facility",
						"booking",
						booking,
					),
				);
				form.append(
					"specific_information",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"specific_information",
						"None",
						"booking",
						booking,
					),
				);
				form.append(
					"sample_rows",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"sample_rows",
						"[]",
						"booking",
						booking,
					),
				);
				form.append(
					"sample_name",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"sample_name",
						"Sample 1",
						"booking",
						booking,
					),
				);
				form.append(
					"user_type",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"user_type",
						"PU",
						"booking",
						booking,
					),
				);
				form.append(
					"booking_gstn",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"booking_gstn",
						"1234546",
						"booking",
						booking,
					),
				);
				form.append(
					"consumables_provided_by",
					resolveFieldValue(
						responses,
						mapping,
						defaults,
						"consumables_provided_by",
						"test",
						"booking",
						booking,
					),
				);

				const response = await fetch(
					`${ISTEM_BASE_URL}/api/create-booking`,
					{
						method: "POST",
						headers: {
							Token: token,
							"Content-Type": "application/x-www-form-urlencoded",
						},
						body: form.toString(),
					},
				);

				if (!response.ok) {
					throw new Error(
						`I-STEM server responded with status ${response.status}`,
					);
				}

				const resData = await response.json();
				const statusStr = String(resData.status || "").toLowerCase();
				if (statusStr !== "success" && statusStr !== "sucess") {
					throw new Error(
						resData.message ||
							resData.error ||
							"I-STEM Sync Failed",
					);
				}

				const rawId = resData.new_service_id || resData.id;
				if (isNew && !rawId) {
					throw new Error(
						"I-STEM sync succeeded but booking id was not returned",
					);
				}
				const newIstemId = rawId ? String(rawId) : booking.istemId;

				await db
					.update(bookings)
					.set({
						istemId: newIstemId,
						istemSyncedAt: new Date(),
					})
					.where(eq(bookings.id, booking.id));

				successCount++;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : String(err);
				failCount++;
				errors.push(`Booking ID ${row.booking.id}: ${errorMessage}`);
			}
		}

		return { successCount, failCount, errors };
	},
);
