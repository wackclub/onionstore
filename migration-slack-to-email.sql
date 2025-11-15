-- Migration: Replace Slack authentication with email authentication
-- WARNING: This migration will modify existing data. Back up your database first!

BEGIN;

-- Step 1: Add new columns to user table
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "id" text,
  ADD COLUMN IF NOT EXISTS "email" text,
  ADD COLUMN IF NOT EXISTS "createdAt" timestamp DEFAULT now();

-- Step 2: Generate IDs for existing users (using nanoid-like pattern)
-- For existing users, we'll use their slackId as email temporarily
-- YOU MUST UPDATE THESE EMAILS MANUALLY after the migration
UPDATE "user"
SET
  "id" = "slackId",
  "email" = "slackId" || '@temp.invalid',
  "createdAt" = COALESCE("createdAt", now())
WHERE "id" IS NULL;

-- Step 3: Make new columns NOT NULL after populating them
ALTER TABLE "user"
  ALTER COLUMN "id" SET NOT NULL,
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "createdAt" SET NOT NULL;

-- Step 4: Add unique constraint on email
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");

-- Step 5: Update foreign keys in shop_orders
-- First, update the userId values to match new id column
-- (Since we set id = slackId, this should be a no-op, but ensures data integrity)
UPDATE shop_orders SET "userId" = "userId";

-- Step 6: Update foreign keys in payouts
UPDATE payouts SET "userId" = "userId";

-- Step 7: Drop old foreign key constraints
ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS "shop_orders_userId_user_slackId_fk";
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS "payouts_userId_user_slackId_fk";

-- Step 8: Drop the old primary key and create new one
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_pkey";
ALTER TABLE "user" ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");

-- Step 9: Add new foreign key constraints
ALTER TABLE shop_orders
  ADD CONSTRAINT "shop_orders_userId_user_id_fk"
  FOREIGN KEY ("userId") REFERENCES "user"("id");

ALTER TABLE payouts
  ADD CONSTRAINT "payouts_userId_user_id_fk"
  FOREIGN KEY ("userId") REFERENCES "user"("id");

-- Step 10: Drop old columns
ALTER TABLE "user"
  DROP COLUMN IF EXISTS "slackId",
  DROP COLUMN IF EXISTS "yswsDbFulfilled";

-- Step 11: Make avatarUrl nullable (it was required before)
ALTER TABLE "user" ALTER COLUMN "avatarUrl" DROP NOT NULL;

-- Step 12: Create login_tokens table
CREATE TABLE IF NOT EXISTS "login_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "login_tokens_token_unique" UNIQUE("token")
);

CREATE INDEX IF NOT EXISTS "login_tokens_email_idx" ON "login_tokens" USING btree ("email");
CREATE INDEX IF NOT EXISTS "login_tokens_token_idx" ON "login_tokens" USING btree ("token");

-- Step 13: Drop and recreate the users_with_tokens view with new schema
DROP VIEW IF EXISTS "users_with_tokens";

CREATE VIEW "users_with_tokens" AS (
  SELECT
    "id",
    "email",
    "displayName",
    "avatarUrl",
    "isAdmin",
    "country",
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
    ) as "tokens"
  FROM "user"
);

COMMIT;

-- IMPORTANT POST-MIGRATION STEPS:
-- 1. Update all user emails from temporary values (slackId@temp.invalid) to real emails
-- 2. Set up Loops.so with login email template
-- 3. Update environment variables:
--    - LOOPS_API_KEY
--    - LOOPS_LOGIN_EMAIL_TEMPLATE_ID
-- 4. Inform users they need to log in again with their email addresses
