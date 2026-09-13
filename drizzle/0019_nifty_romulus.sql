CREATE TYPE "public"."char_limit_type" AS ENUM('max', 'exact');--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "char_limit_type" char_limit_type;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "char_limit" integer;