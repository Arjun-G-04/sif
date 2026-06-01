ALTER TYPE "public"."user_role" ADD VALUE 'operator';--> statement-breakpoint
CREATE TABLE "operator_equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	CONSTRAINT "operator_equipments_operator_equipment_unique" UNIQUE("operator_id","equipment_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "operator_equipments" ADD CONSTRAINT "operator_equipments_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_equipments" ADD CONSTRAINT "operator_equipments_equipment_id_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipments"("id") ON DELETE cascade ON UPDATE no action;