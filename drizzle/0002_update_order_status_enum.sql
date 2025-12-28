-- Update order status enum from 'fulfilled' to 'approved'
-- First, update any existing 'fulfilled' orders to 'approved'
UPDATE "shopOrders" SET "status" = 'approved' WHERE "status" = 'fulfilled';

-- Drop the old constraint
ALTER TABLE "shopOrders" DROP CONSTRAINT IF EXISTS "shopOrders_status_check";

-- Add the new constraint with 'approved' instead of 'fulfilled'
ALTER TABLE "shopOrders" ADD CONSTRAINT "shopOrders_status_check"
CHECK ("status" IN ('pending', 'approved', 'rejected'));
