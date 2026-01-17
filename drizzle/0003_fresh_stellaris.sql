DROP INDEX "payouts_airtable_submission_id_idx";--> statement-breakpoint
DROP INDEX "user_airtable_record_id_idx";--> statement-breakpoint
DROP INDEX "shop_items_airtable_record_id_idx";--> statement-breakpoint
DROP INDEX "shop_orders_airtable_record_id_idx";--> statement-breakpoint
ALTER TABLE "payouts" DROP COLUMN "airtableSubmissionId";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "airtableRecordId";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "totalEarnedPoints";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "pointsRedeemed";--> statement-breakpoint
ALTER TABLE "shop_items" DROP COLUMN "airtableRecordId";--> statement-breakpoint
ALTER TABLE "shop_orders" DROP COLUMN "airtableRecordId";