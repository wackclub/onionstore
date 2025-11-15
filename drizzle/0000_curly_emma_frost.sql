CREATE TABLE "login_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "login_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"tokens" integer NOT NULL,
	"userId" text NOT NULL,
	"memo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"submittedToUnified" boolean DEFAULT false NOT NULL,
	"baseHackatimeHours" numeric DEFAULT '0.0' NOT NULL,
	"overridenHours" numeric DEFAULT '0.0'
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"displayName" text,
	"avatarUrl" text,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"country" varchar(2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"imageUrl" text NOT NULL,
	"price" integer NOT NULL,
	"usd_cost" integer,
	"type" varchar,
	"hcbMids" text[]
);
--> statement-breakpoint
CREATE TABLE "shop_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"shopItemId" text NOT NULL,
	"priceAtOrder" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"memo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shopItemId_shop_items_id_fk" FOREIGN KEY ("shopItemId") REFERENCES "public"."shop_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_tokens_email_idx" ON "login_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "login_tokens_token_idx" ON "login_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "payouts_user_id_idx" ON "payouts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "payouts_created_at_idx" ON "payouts" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "payouts_submitted_to_unified_idx" ON "payouts" USING btree ("submittedToUnified");--> statement-breakpoint
CREATE INDEX "shop_orders_user_id_idx" ON "shop_orders" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "shop_orders_shop_item_id_idx" ON "shop_orders" USING btree ("shopItemId");--> statement-breakpoint
CREATE INDEX "shop_orders_status_idx" ON "shop_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shop_orders_created_at_idx" ON "shop_orders" USING btree ("createdAt");--> statement-breakpoint
CREATE VIEW "public"."users_with_tokens" AS (select "id", "email", "displayName", "avatarUrl", "isAdmin", "country", 
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