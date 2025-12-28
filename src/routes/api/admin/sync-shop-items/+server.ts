import { json, error } from '@sveltejs/kit';
import { db, shopItems } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { syncShopItemToAirtable } from '$lib/server/airtable';
import type { RequestHandler } from './$types';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	if (!AIRTABLE_API_KEY) {
		throw error(400, 'AIRTABLE_API_KEY not configured');
	}

	try {
		const items = await db.select().from(shopItems);

		let created = 0;
		let updated = 0;
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
						type: item.type as 'hcb' | 'third_party' | null
					},
					item.airtableRecordId
				);

				// Update local record with Airtable ID if it was newly created
				if (!item.airtableRecordId && airtableId) {
					await db
						.update(shopItems)
						.set({ airtableRecordId: airtableId })
						.where(eq(shopItems.id, item.id));
				}

				if (item.airtableRecordId) {
					updated++;
				} else {
					created++;
				}
			} catch (err) {
				console.error(`Failed to sync item ${item.name}:`, err);
				failed++;
			}
		}

		return json({
			success: true,
			message: `Shop items sync completed! Created: ${created}, Updated: ${updated}, Failed: ${failed}`,
			stats: {
				created,
				updated,
				failed,
				total: items.length
			}
		});
	} catch (err) {
		console.error('Shop items sync error:', err);
		throw error(500, err instanceof Error ? err.message : 'Sync failed');
	}
};
