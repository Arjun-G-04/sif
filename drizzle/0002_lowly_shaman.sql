ALTER TABLE "registrations" ADD COLUMN "accepted" boolean;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE no action ON UPDATE no action;