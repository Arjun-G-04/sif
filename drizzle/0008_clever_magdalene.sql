ALTER TYPE "public"."booking_status" ADD VALUE 'payment_verification' BEFORE 'processing';--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE 'completed';