CREATE TYPE "public"."unterkunft_application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "unterkunft_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unterkunft_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" "unterkunft_application_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"admin_note" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "unterkunft_email_whitelist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unterkunft_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unterkuenfte" ALTER COLUMN "lat" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "unterkuenfte" ALTER COLUMN "lng" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "unterkunft_applications" ADD CONSTRAINT "unterkunft_applications_unterkunft_id_unterkuenfte_id_fk" FOREIGN KEY ("unterkunft_id") REFERENCES "public"."unterkuenfte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unterkunft_email_whitelist" ADD CONSTRAINT "unterkunft_email_whitelist_unterkunft_id_unterkuenfte_id_fk" FOREIGN KEY ("unterkunft_id") REFERENCES "public"."unterkuenfte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unterkunft_applications_status_idx" ON "unterkunft_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "unterkunft_applications_unterkunft_idx" ON "unterkunft_applications" USING btree ("unterkunft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unterkunft_applications_user_unterkunft_unique" ON "unterkunft_applications" USING btree ("user_id","unterkunft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unterkunft_email_whitelist_unique" ON "unterkunft_email_whitelist" USING btree ("unterkunft_id","email");--> statement-breakpoint
CREATE INDEX "unterkunft_email_whitelist_unterkunft_idx" ON "unterkunft_email_whitelist" USING btree ("unterkunft_id");