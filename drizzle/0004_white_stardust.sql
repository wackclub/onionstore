ALTER TABLE "user" ADD COLUMN "airtableSignupsRecordId" text;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "airtableRecordId" text;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "airtableRecordId" text;--> statement-breakpoint
CREATE INDEX "user_airtable_signups_record_id_idx" ON "user" USING btree ("airtableSignupsRecordId");--> statement-breakpoint
CREATE INDEX "shop_items_airtable_record_id_idx" ON "shop_items" USING btree ("airtableRecordId");--> statement-breakpoint
CREATE INDEX "shop_orders_airtable_record_id_idx" ON "shop_orders" USING btree ("airtableRecordId");