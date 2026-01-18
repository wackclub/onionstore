ALTER TABLE "shop_items" ADD COLUMN "hcbIsPreauth" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN "hcbPurpose" text;