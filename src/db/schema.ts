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

export const fieldType = pgEnum("field_type", [
	"text",
	"date",
	"single_select",
	"file",
]);

export const entityType = pgEnum("entity_type", ["registration"]);

export const fields = pgTable("fields", {
	id: serial().primaryKey(),
	entityType: entityType("entity_type").notNull(),
	name: text().notNull(),
	type: fieldType().notNull(),
	order: integer().notNull().default(0),
	active: boolean().notNull().default(true),
});

export const fieldOptions = pgTable("field_options", {
	id: serial().primaryKey(),
	fieldId: integer("field_id")
		.notNull()
		.references(() => fields.id, { onDelete: "cascade" }),
	value: text().notNull(),
});

export const fieldResponses = pgTable("field_responses", {
	id: serial().primaryKey(),
	entityType: entityType("entity_type").notNull(),
	entityId: integer("entity_id").notNull(), // References the row id in that table
	fieldId: integer("field_id")
		.notNull()
		.references(() => fields.id, { onDelete: "cascade" }),
	value: text(), // Stores all values as text (dates as ISO strings, files as paths/URLs)
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
