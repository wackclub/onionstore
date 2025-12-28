import { db } from '../src/lib/server/db';
import { shopItems } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { syncShopItemToAirtable } from '../src/lib/server/airtable';

async function syncAllShopItems(): Promise<void> {
	console.log('Fetching shop items from Postgres...');
	const items = await db.select().from(shopItems);
	console.log(`Found ${items.length} shop items`);

	let synced = 0;
	let failed = 0;

	for (const item of items) {
		try {
			const airtableId = await syncShopItemToAirtable(
				{
					name: item.name,
					description: item.description,
					imageUrl: item.imageUrl,
					price: item.price,
					usdCost: item.usd_cost,
					type: item.type
				},
				item.airtableRecordId
			);

			if (!item.airtableRecordId) {
				await db
					.update(shopItems)
					.set({ airtableRecordId: airtableId })
					.where(eq(shopItems.id, item.id));
			}

			synced++;
		} catch (error) {
			console.error(`Failed to sync item ${item.name}:`, error);
			failed++;
		}
	}

	console.log('\n=== Shop Items Sync Complete ===');
	console.log(`Synced: ${synced}`);
	console.log(`Failed: ${failed}`);
}

async function main() {
	try {
		console.log('=== Postgres -> Airtable Shop Items Sync ===\n');
		await syncAllShopItems();
	} catch (error) {
		console.error('Sync failed:', error);
		process.exit(1);
	}
}

main();
