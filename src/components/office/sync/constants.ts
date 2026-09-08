export interface ApiField {
	readonly key: string;
	readonly label: string;
}

export const USER_API_FIELDS: readonly ApiField[] = [
	{ key: "user_first_name", label: "First Name" },
	{ key: "user_last_name", label: "Last Name" },
	{ key: "user_email", label: "Email Address" },
	{ key: "user_contactno", label: "Contact Number" },
	{ key: "user_organisation", label: "Organisation" },
	{ key: "billing_user_name", label: "Billing Name" },
	{ key: "billing_address", label: "Billing Address" },
	{ key: "user_gender", label: "Gender" },
	{ key: "user_salutation", label: "Salutation" },
	{ key: "user_address", label: "Address" },
	{ key: "user_city", label: "City" },
	{ key: "user_district", label: "District" },
	{ key: "user_state", label: "State" },
	{ key: "user_country", label: "Country" },
	{ key: "user_pin", label: "PIN Code" },
	{ key: "institute_id", label: "Institute ID" },
	{ key: "user_type", label: "User Type (e.g. Academic User)" },
] as const;

export const EQUIPMENT_API_FIELDS: readonly ApiField[] = [
	{ key: "equipment_name", label: "Equipment Name" },
	{ key: "equipment_make", label: "Make" },
	{ key: "equipment_model", label: "Model" },
	{ key: "equipment_dept_lab", label: "Department / Lab" },
	{ key: "equipment_rate", label: "Usage Rate" },
	{ key: "equipment_srno", label: "Serial Number" },
	{ key: "equipment_location", label: "Location" },
	{ key: "equipment_website", label: "Website URL" },
	{ key: "equipment_description", label: "Description" },
	{ key: "institute_id", label: "Institute ID" },
] as const;

export const BOOKING_API_FIELDS: readonly ApiField[] = [
	{ key: "service_type", label: "Service Type (e.g. Fabrication)" },
	{ key: "billing_state", label: "Billing State" },
	{ key: "billing_address", label: "Billing Address" },
	{ key: "booking_remark", label: "Booking Remark" },
	{ key: "booking_title", label: "Booking Title" },
	{ key: "background_of_work", label: "Background of Work" },
	{ key: "exclusive_use", label: "Exclusive Use Info" },
] as const;

/**
 * Checks whether any field in the definition is missing a mapping or set to "default"
 */
export function hasUnmappedFields(
	fields: readonly ApiField[],
	mapping: Record<string, string> = {},
): boolean {
	return fields.some(({ key }) => {
		const val = mapping[key];
		return !val || val === "default";
	});
}

/**
 * Checks whether any equipment has unmapped booking fields
 */
export function hasUnmappedBookingFields(
	equipments: Array<{ id: number }> | undefined,
	bookingMappings: Record<string, Record<string, string>>,
): boolean {
	if (!equipments || equipments.length === 0) return false;
	return equipments.some((eq) =>
		hasUnmappedFields(
			BOOKING_API_FIELDS,
			bookingMappings[String(eq.id)] || {},
		),
	);
}
