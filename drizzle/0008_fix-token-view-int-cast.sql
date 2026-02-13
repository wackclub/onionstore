DROP VIEW "public"."users_with_tokens";--> statement-breakpoint
CREATE VIEW "public"."users_with_tokens" AS (select "id", "email", "displayName", "isAdmin", "country",
			(GREATEST(
				COALESCE(
					(SELECT SUM(tokens) FROM payouts WHERE "userId" = "user"."id"),
					0
				) -
				COALESCE(
					(SELECT SUM("priceAtOrder") FROM shop_orders WHERE "userId" = "user"."id" AND status IN ('pending', 'approved')),
					0
				),
				0
			))::int
		 as "tokens" from "user");
