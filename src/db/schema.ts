import {
	boolean,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["public", "admin"]);
export const bookingStatus = pgEnum("booking_status", [
	"pending",
	"payment",
	"payment_verification",
	"processing",
	"rejected",
	"completed",
]);

export const users = pgTable("users", {
	id: serial().primaryKey(),
	username: text().notNull().unique(),
	password: text().notNull(),
	role: userRole().notNull().default("public"),
	registrationId: integer("registration_id").references(
		() => registrations.id,
	),
});

export const registrations = pgTable("registrations", {
	id: serial().primaryKey(),
	password: text().notNull(),
	email: text().notNull(),
	phone: text().notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	accepted: boolean("accepted"),
	rejectionReason: text("rejection_reason"),
});

export const otpType = pgEnum("otp_type", ["email", "phone"]);

export const otpVerifications = pgTable("otp_verifications", {
	id: serial().primaryKey(),
	type: otpType().notNull(),
	target: text().notNull(), // email address or phone number
	otpHash: text("otp_hash").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	attempts: integer().notNull().default(0),
	verified: boolean().notNull().default(false),
	turnstileToken: text("turnstile_token"), // stored for audit/debugging
	createdAt: timestamp("created_at").defaultNow(),
});

export const configurations = pgTable("configurations", {
	id: serial().primaryKey(),
	officeEmail: text(),
});

export const equipments = pgTable("equipments", {
	id: serial().primaryKey(),
	name: text().notNull(),
	code: text().notNull().unique(),
	active: boolean().notNull().default(true),
});

// Field/Form System

export const fieldType = pgEnum("field_type", [
	"text",
	"date",
	"single_select",
	"multi_select",
	"file",
	"relation",
	"heading",
	"info_text",
	"group",
	"admin_file",
]);

export const entityType = pgEnum("entity_type", ["registration", "equipment"]);

export const fieldStage = pgEnum("field_stage", ["initial", "payment"]);

export const fields = pgTable("fields", {
	id: serial().primaryKey(),
	entityType: entityType("entity_type").notNull(),
	entityId: integer("entity_id"), // NULL = applies to all entities of this type, set = specific entity (e.g., specific equipment)
	parentId: integer("parent_id"), // Self-reference for nested fields (e.g. inside a group)
	name: text().notNull(),
	type: fieldType().notNull(),
	order: integer().notNull().default(0),
	stage: fieldStage().notNull().default("initial"),
	active: boolean().notNull().default(true),
});

export const fieldGroups = pgTable("field_groups", {
	id: serial().primaryKey(),
	fieldId: integer("field_id")
		.notNull()
		.unique()
		.references(() => fields.id, { onDelete: "cascade" }),
	max: integer().notNull().default(1), // Maximum number of iterations allowed
});

export const fieldAdminFiles = pgTable("field_admin_files", {
	id: serial().primaryKey(),
	fieldId: integer("field_id")
		.notNull()
		.unique()
		.references(() => fields.id, { onDelete: "cascade" }),
	filePath: text("file_path").notNull(),
	originalName: text("original_name").notNull(),
});

export const fieldOptions = pgTable("field_options", {
	id: serial().primaryKey(),
	fieldId: integer("field_id")
		.notNull()
		.references(() => fields.id, { onDelete: "cascade" }),
	value: text().notNull(),
});

export const fieldRelations = pgTable("field_relations", {
	id: serial().primaryKey(),
	fieldId: integer("field_id")
		.notNull()
		.unique()
		.references(() => fields.id, { onDelete: "cascade" }),
	relatedEntityType: entityType("related_entity_type").notNull(),
	relatedFieldId: integer("related_field_id")
		.notNull()
		.references(() => fields.id, { onDelete: "cascade" }),
});

export const bookings = pgTable("bookings", {
	id: serial().primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	equipmentId: integer("equipment_id")
		.notNull()
		.references(() => equipments.id, { onDelete: "cascade" }),
	status: bookingStatus().notNull().default("pending"),
	price: integer(),
	remarks: text(),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Update fieldResponses to reference booking
export const fieldResponses = pgTable("field_responses", {
	id: serial().primaryKey(),
	entityType: entityType("entity_type").notNull(),
	entityId: integer("entity_id").notNull(), // References the row id in that table
	userId: integer("user_id").references(() => users.id), // NULL = anonymous/unlinked, set = submitted by this user
	bookingId: integer("booking_id").references(() => bookings.id, {
		onDelete: "cascade",
	}), // Link to specific booking if applicable
	fieldId: integer("field_id")
		.notNull()
		.references(() => fields.id, { onDelete: "cascade" }),
	iteration: integer().notNull().default(0), // For grouped fields, which iteration is this?
	value: text(), // Stores all values as text (dates as ISO strings, files as paths/URLs)
	adminValue: text("admin_value"), // Admin-edited value
});
