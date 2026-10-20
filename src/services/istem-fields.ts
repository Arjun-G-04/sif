import type { bookings, equipments, registrations, users } from "@/db/schema";
import { formatToLocalIstemTime } from "@/lib/istem";
import { createServerOnlyFn } from "@tanstack/react-start";

export interface FieldDescriptor<T> {
	key: string;
	fallback?: string | null | ((record: T) => string | null);
}

export const USER_API_FIELD_KEYS = [
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

export const EQUIPMENT_API_FIELD_KEYS = [
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

export const BOOKING_API_FIELD_KEYS = [
	"service_type",
	"billing_state",
	"billing_address",
	"booking_remark",
	"booking_title",
	"background_of_work",
	"exclusive_use",
];

export interface UserSyncRow {
	user: typeof users.$inferSelect;
	registration: typeof registrations.$inferSelect | null;
}

export interface BookingSyncRow {
	booking: typeof bookings.$inferSelect;
	user: typeof users.$inferSelect;
	equipment: typeof equipments.$inferSelect;
}

export const USER_FIELD_DEFS: FieldDescriptor<UserSyncRow>[] = [
	{ key: "user_first_name", fallback: (r) => r.user.username },
	{ key: "user_last_name", fallback: "-" },
	{
		key: "user_email",
		fallback: (r) =>
			r.registration?.email || `${r.user.username}@example.com`,
	},
	{
		key: "user_contactno",
		fallback: (r) => r.registration?.phone || "0000000000",
	},
	{ key: "user_organisation", fallback: "NIT Tiruchirappalli" },
	{ key: "billing_user_name", fallback: null },
	{ key: "billing_address", fallback: null },
	{ key: "institute_id", fallback: null },
	{ key: "user_type", fallback: "Academic User" },
	{ key: "user_gender", fallback: "Male" },
	{ key: "user_salutation", fallback: "Prof." },
	{ key: "user_address", fallback: null },
	{ key: "user_city", fallback: null },
	{ key: "user_district", fallback: null },
	{ key: "user_state", fallback: null },
	{ key: "user_country", fallback: "India" },
	{ key: "user_pin", fallback: null },
];

export const EQUIPMENT_FIELD_DEFS: FieldDescriptor<
	typeof equipments.$inferSelect
>[] = [
	{ key: "equipment_name", fallback: (e) => e.name },
	{ key: "equipment_make", fallback: (e) => e.make || null },
	{ key: "equipment_model", fallback: (e) => e.model || null },
	{ key: "equipment_dept_lab", fallback: (e) => e.departmentLab || null },
	{ key: "institute_id", fallback: null },
	{ key: "equipment_rate", fallback: (e) => e.usageRate || "100" },
	{ key: "equipment_srno", fallback: (e) => e.serialNumber || e.code },
	{ key: "equipment_facility_id", fallback: "1" },
	{ key: "equipment_department_id", fallback: "1" },
	{ key: "equipment_compatibility", fallback: "Compatible" },
	{ key: "equipment_cost", fallback: "100" },
	{ key: "equipment_uom", fallback: "Hour" },
	{ key: "equipment_agency_id", fallback: "109" },
	{ key: "funding_agency_type", fallback: "External Funding" },
	{ key: "category", fallback: "Fabrication" },
	{ key: "equipment_abbr", fallback: (e) => e.code },
	{ key: "equipment_location", fallback: (e) => e.location || null },
	{
		key: "equipment_website",
		fallback: (e) => e.websiteUrl || "http://example.com",
	},
	{ key: "equipment_project_id", fallback: "0" },
	{
		key: "equipment_description",
		fallback: (e) => e.description || `Local equipment: ${e.name}`,
	},
];

export const BOOKING_FIELD_DEFS: FieldDescriptor<BookingSyncRow>[] = [
	{
		key: "preferred_timings_from",
		fallback: () =>
			formatToLocalIstemTime(new Date(Date.now() + 24 * 3600 * 1000)),
	},
	{
		key: "preferred_timings_to",
		fallback: () =>
			formatToLocalIstemTime(new Date(Date.now() + 25 * 3600 * 1000)),
	},
	{ key: "service_type", fallback: "Fabrication" },
	{ key: "remarks", fallback: (r) => r.booking.remarks || "Sync booking" },
	{ key: "booking_by", fallback: (r) => r.user.username },
	{ key: "billing_user_name", fallback: (r) => r.user.username },
	{ key: "billing_address", fallback: "NIT Tiruchirappalli" },
	{ key: "billing_state", fallback: "Tamil Nadu" },
	{ key: "req_unit", fallback: "1:00" },
	{ key: "booking_remark", fallback: "Local SIF Booking" },
	{
		key: "booking_title",
		fallback: (r) => `Booking for ${r.equipment.name}`,
	},
	{ key: "bk_natsamp", fallback: "Test" },
	{ key: "bk_tecinf", fallback: "Test" },
	{ key: "bk_speinf", fallback: "Test" },
	{
		key: "total_est_amt",
		fallback: (r) => String(r.booking.price || "100"),
	},
	{ key: "eq_rate", fallback: "100" },
	{ key: "usage_type", fallback: "industry" },
	{ key: "background_of_work", fallback: "Research" },
	{ key: "booking_no_sample", fallback: "01:00" },
	{ key: "gstin", fallback: "123245" },
	{ key: "equipment_uom", fallback: "Hour" },
	{ key: "analysis_type", fallback: "Hour" },
	{ key: "addl_amt", fallback: "0" },
	{ key: "working_hrs", fallback: "1" },
	{ key: "exclusive_use", fallback: "test" },
	{ key: "consumables_provided by", fallback: "Institution Facility" },
	{ key: "specific_information", fallback: "None" },
	{ key: "sample_rows", fallback: "[]" },
	{ key: "sample_name", fallback: "Sample 1" },
	{ key: "user_type", fallback: "PU" },
	{ key: "booking_gstn", fallback: "1234546" },
	{ key: "consumables_provided_by", fallback: "test" },
];

export function resolveFieldValue(
	fieldResponses: Array<{ fieldId: number; value: string | null }>,
	mapping: Record<string, string>,
	defaults: Record<string, string>,
	apiKey: string,
	fallbackLocalValue?: string | null,
	entityPrefix?: string,
	// biome-ignore lint/suspicious/noExplicitAny: localRecord can be any DB record
	localRecord?: Record<string, any>,
): string {
	const mappedFieldId = mapping[apiKey];
	const staticKey = entityPrefix ? `${entityPrefix}_${apiKey}` : apiKey;

	if (mappedFieldId === "static") {
		return defaults[staticKey] || "-";
	}
	if (entityPrefix === "equipment" && localRecord) {
		if (mappedFieldId === "active")
			return localRecord.active ? "Active" : "Inactive";
		if (mappedFieldId && mappedFieldId in localRecord) {
			return localRecord[mappedFieldId] || "-";
		}
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

export const buildIstemFormData = createServerOnlyFn(
	<T>(
		fields: FieldDescriptor<T>[],
		record: T,
		options: {
			responses: Array<{ fieldId: number; value: string | null }>;
			mapping: Record<string, string>;
			defaults: Record<string, string>;
			entityPrefix: string;
			// biome-ignore lint/suspicious/noExplicitAny: local DB record
			localRecord?: Record<string, any>;
		},
	): URLSearchParams => {
		const form = new URLSearchParams();
		for (const f of fields) {
			const fallbackVal =
				typeof f.fallback === "function"
					? f.fallback(record)
					: (f.fallback ?? null);
			const val = resolveFieldValue(
				options.responses,
				options.mapping,
				options.defaults,
				f.key,
				fallbackVal,
				options.entityPrefix,
				options.localRecord,
			);
			form.append(f.key, val);
		}
		return form;
	},
);
