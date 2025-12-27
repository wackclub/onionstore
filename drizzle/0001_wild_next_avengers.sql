DROP VIEW "public"."users_with_tokens";--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "airtableSubmissionId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "airtableRecordId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "totalEarnedPoints" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pointsRedeemed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "review" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "githubUrl" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "websiteUrl" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "screenshotUrl" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "addressLine1" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "addressLine2" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "zipPostal" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "shippingCountry" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "slackId" text;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "airtableRecordId" text;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "airtableRecordId" text;--> statement-breakpoint
CREATE INDEX "payouts_airtable_submission_id_idx" ON "payouts" USING btree ("airtableSubmissionId");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "avatarUrl";--> statement-breakpoint
CREATE VIEW "public"."users_with_tokens" AS (select "id", "email", "displayName", "isAdmin", "country", 
			GREATEST(
				COALESCE(
					(SELECT SUM(tokens) FROM payouts WHERE "userId" = "user"."id"),
					0
				) -
				COALESCE(
					(SELECT SUM("priceAtOrder") FROM shop_orders WHERE "userId" = "user"."id" AND status IN ('pending', 'fulfilled')),
					0
				),
				0
			)
		 as "tokens" from "user");