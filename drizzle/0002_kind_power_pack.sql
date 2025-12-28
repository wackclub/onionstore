DROP VIEW "public"."users_with_tokens";--> statement-breakpoint
CREATE INDEX "login_tokens_expires_at_idx" ON "login_tokens" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "payouts_user_id_created_at_idx" ON "payouts" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "payouts_user_id_submitted_idx" ON "payouts" USING btree ("userId","submittedToUnified");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_is_admin_idx" ON "user" USING btree ("isAdmin");--> statement-breakpoint
CREATE INDEX "user_country_idx" ON "user" USING btree ("country");--> statement-breakpoint
CREATE INDEX "user_airtable_record_id_idx" ON "user" USING btree ("airtableRecordId");--> statement-breakpoint
CREATE INDEX "shop_items_type_idx" ON "shop_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "shop_items_price_idx" ON "shop_items" USING btree ("price");--> statement-breakpoint
CREATE INDEX "shop_items_airtable_record_id_idx" ON "shop_items" USING btree ("airtableRecordId");--> statement-breakpoint
CREATE INDEX "shop_orders_user_id_status_idx" ON "shop_orders" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "shop_orders_status_created_at_idx" ON "shop_orders" USING btree ("status","createdAt");--> statement-breakpoint
CREATE INDEX "shop_orders_airtable_record_id_idx" ON "shop_orders" USING btree ("airtableRecordId");--> statement-breakpoint
CREATE VIEW "public"."users_with_tokens" AS (select "id", "email", "displayName", "isAdmin", "country", 
			GREATEST(
				COALESCE(
					(SELECT SUM(tokens) FROM payouts WHERE "userId" = "user"."id"),
					0
				) -
				COALESCE(
					(SELECT SUM("priceAtOrder") FROM shop_orders WHERE "userId" = "user"."id" AND status IN ('pending', 'approved')),
					0
				),
				0
			)
		 as "tokens" from "user");