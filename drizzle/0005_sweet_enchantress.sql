ALTER TYPE "public"."entity_type" ADD VALUE 'equipment';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'relation';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'heading';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'group';--> statement-breakpoint
ALTER TYPE "public"."field_type" ADD VALUE 'admin_file';--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "equipments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "field_admin_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"field_id" integer NOT NULL,
	"file_path" text NOT NULL,
	"original_name" text NOT NULL,
	CONSTRAINT "field_admin_files_field_id_unique" UNIQUE("field_id")
);
--> statement-breakpoint
CREATE TABLE "field_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"field_id" integer NOT NULL,
	"max" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "field_groups_field_id_unique" UNIQUE("field_id")
);
--> statement-breakpoint
CREATE TABLE "field_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"field_id" integer NOT NULL,
	"related_entity_type" "entity_type" NOT NULL,
	"related_field_id" integer NOT NULL,
	CONSTRAINT "field_relations_field_id_unique" UNIQUE("field_id")
);
--> statement-breakpoint
ALTER TABLE "field_responses" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "field_responses" ADD COLUMN "booking_id" integer;--> statement-breakpoint
ALTER TABLE "field_responses" ADD COLUMN "iteration" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "entity_id" integer;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_equipment_id_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_admin_files" ADD CONSTRAINT "field_admin_files_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_groups" ADD CONSTRAINT "field_groups_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_relations" ADD CONSTRAINT "field_relations_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_relations" ADD CONSTRAINT "field_relations_related_field_id_fields_id_fk" FOREIGN KEY ("related_field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_responses" ADD CONSTRAINT "field_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_responses" ADD CONSTRAINT "field_responses_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;