import { pgEnum, pgTable, serial, text, integer } from "drizzle-orm/pg-core";

// ============ User Management ============

export const userRole = pgEnum("user_role", ["public", "admin"]);

export const users = pgTable("users", {
	id: serial().primaryKey(),
	username: text().notNull().unique(),
	password: text().notNull(),
	role: userRole().notNull().default("public"),
});

// ============ Dynamic Fields System ============

export const fieldType = pgEnum("field_type", [
	"text",
	"date",
	"single_select",
	"file",
]);

export const entityType = pgEnum("entity_type", ["users"]);

// Admin-defined fields per entity type (e.g., entity_type = "users", "products", etc.)
export const fields = pgTable("fields", {
	id: serial().primaryKey(),
	entityType: entityType("entity_type").notNull(),
	name: text().notNull(),
	type: fieldType().notNull(),
	order: integer().notNull().default(0),
});

// Options for single-select fields
export const fieldOptions = pgTable("field_options", {
	id: serial().primaryKey(),
	fieldId: integer("field_id")
		.notNull()
		.references(() => fields.id, { onDelete: "cascade" }),
	value: text().notNull(),
});

// User responses - links to any entity via entity_type + entity_id
export const fieldResponses = pgTable("field_responses", {
	id: serial().primaryKey(),
	entityType: entityType("entity_type").notNull(),
	entityId: integer("entity_id").notNull(), // References the row id in that table
	fieldId: integer("field_id")
		.notNull()
		.references(() => fields.id, { onDelete: "cascade" }),
	value: text(), // Stores all values as text (dates as ISO strings, files as paths/URLs)
});
