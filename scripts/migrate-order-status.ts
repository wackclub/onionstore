import { db } from '../src/lib/server/db';
import { sql } from 'drizzle-orm';

async function migrateOrderStatus() {
	try {
		console.log('Updating order status enum from "fulfilled" to "approved"...\n');

		// Update any existing 'fulfilled' orders to 'approved'
		await db.execute(sql`UPDATE "shopOrders" SET "status" = 'approved' WHERE "status" = 'fulfilled'`);
		console.log('✓ Updated existing fulfilled orders to approved');

		// Drop the old constraint
		await db.execute(sql`ALTER TABLE "shopOrders" DROP CONSTRAINT IF EXISTS "shopOrders_status_check"`);
		console.log('✓ Dropped old constraint');

		// Add the new constraint
		await db.execute(sql`ALTER TABLE "shopOrders" ADD CONSTRAINT "shopOrders_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'))`);
		console.log('✓ Added new constraint with approved status');

		console.log('\n✓ Migration completed successfully!');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	}
}

migrateOrderStatus();
