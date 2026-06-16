ALTER TABLE "bookings" ADD COLUMN "istem_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "istem_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "configurations" ADD COLUMN "istem_token" text;--> statement-breakpoint
ALTER TABLE "configurations" ADD COLUMN "istem_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "configurations" ADD COLUMN "istem_user_mapping" jsonb;--> statement-breakpoint
ALTER TABLE "configurations" ADD COLUMN "istem_equipment_mapping" jsonb;--> statement-breakpoint
ALTER TABLE "configurations" ADD COLUMN "istem_static_defaults" jsonb;--> statement-breakpoint
ALTER TABLE "equipments" ADD COLUMN "istem_id" text;--> statement-breakpoint
ALTER TABLE "equipments" ADD COLUMN "istem_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "equipments" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "equipments" ADD COLUMN "istem_booking_mapping" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "istem_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "istem_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;