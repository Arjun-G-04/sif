CREATE TYPE "public"."booking_status" AS ENUM('pending', 'payment', 'processing', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."field_stage" AS ENUM('initial', 'payment');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "status" "booking_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "price" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "field_responses" ADD COLUMN "admin_value" text;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "stage" "field_stage" DEFAULT 'initial' NOT NULL;