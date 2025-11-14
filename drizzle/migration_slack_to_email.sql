-- Migration from Slack-based authentication to Email-based authentication
-- WARNING: This migration will modify the user table and all foreign key references
-- IMPORTANT: Back up your database before running this migration!

-- Step 1: Create the login_tokens table for magic link authentication
CREATE TABLE IF NOT EXISTS "login_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "login_tokens_email_idx" ON "login_tokens" USING btree ("email");
CREATE INDEX IF NOT EXISTS "login_tokens_expires_at_idx" ON "login_tokens" USING btree ("expiresAt");

-- Step 2: Drop the users_with_tokens view (will be recreated later)
DROP VIEW IF EXISTS "users_with_tokens";

-- Step 3: Drop foreign key constraints on shop_orders and payouts tables
ALTER TABLE "shop_orders" DROP CONSTRAINT IF EXISTS "shop_orders_userId_user_slackId_fk";
ALTER TABLE "payouts" DROP CONSTRAINT IF EXISTS "payouts_userId_user_slackId_fk";

-- Step 4: Add email column to user table (if not exists)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "email" text;

-- Step 5: Migrate existing data - set email to slackId as a temporary measure
-- Users will need to update their email addresses or re-register with email login
UPDATE "user" SET "email" = "slackId" WHERE "email" IS NULL;

-- Step 6: Make avatarUrl nullable (some users may not have avatars)
ALTER TABLE "user" ALTER COLUMN "avatarUrl" DROP NOT NULL;

-- Step 7: Drop the old slackId primary key constraint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_pkey";

-- Step 8: Set email as the new primary key
ALTER TABLE "user" ADD CONSTRAINT "user_pkey" PRIMARY KEY ("email");

-- Step 9: Drop the slackId column (data has been migrated to email)
ALTER TABLE "user" DROP COLUMN IF EXISTS "slackId";

-- Step 10: Add new foreign key constraints with email references
ALTER TABLE "payouts"
	ADD CONSTRAINT "payouts_userId_user_email_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("email")
	ON DELETE no action ON UPDATE no action;

ALTER TABLE "shop_orders"
	ADD CONSTRAINT "shop_orders_userId_user_email_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("email")
	ON DELETE no action ON UPDATE no action;

-- Step 11: Recreate the users_with_tokens view with email
CREATE VIEW "users_with_tokens" AS (
	select
		"email",
		"displayName",
		"avatarUrl",
		"isAdmin",
		GREATEST(
			COALESCE(
				(SELECT SUM(tokens) FROM payouts WHERE "userId" = "user"."email"),
				0
			) -
			COALESCE(
				(SELECT SUM("priceAtOrder") FROM shop_orders WHERE "userId" = "user"."email" AND status IN ('pending', 'fulfilled')),
				0
			),
			0
		) as "tokens"
	from "user"
);

-- Migration complete!
-- NOTE: All existing users now have their slackId as their email address
-- They will need to use email-based login moving forward
