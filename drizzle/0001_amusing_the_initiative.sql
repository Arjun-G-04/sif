CREATE TYPE "public"."otp_type" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "otp_type" NOT NULL,
	"target" text NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"turnstile_token" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "field_responses" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "fields" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."entity_type";--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('registration');--> statement-breakpoint
ALTER TABLE "field_responses" ALTER COLUMN "entity_type" SET DATA TYPE "public"."entity_type" USING "entity_type"::"public"."entity_type";--> statement-breakpoint
ALTER TABLE "fields" ALTER COLUMN "entity_type" SET DATA TYPE "public"."entity_type" USING "entity_type"::"public"."entity_type";