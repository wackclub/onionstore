import { json, error } from '@sveltejs/kit';
import { db, shopItems } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { AIRTABLE_BASE_ID, AIRTABLE_SHOP_ITEMS_TABLE } from '$lib/server/airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

interface AirtableShopItem {
	id: string;
	fields: {
		name?: string;
		description?: string;
		imageUrl?: string;
		price?: number;
		usd_cost?: number;
		type?: string;
	};
}

interface AirtableResponse {
	records: AirtableShopItem[];
	offset?: string;
}

async function fetchShopItemsFromAirtable(): Promise<AirtableShopItem[]> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY not configured');
	}

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_SHOP_ITEMS_TABLE)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: AirtableShopItem[] = [];
	let offset: string | undefined;

	do {
		const params = new URLSearchParams();
		if (offset) params.set('offset', offset);

		const response = await fetch(`${url}?${params}`, { headers });
		if (!response.ok) {
			throw new Error(`Failed to fetch shop items: ${response.status} ${response.statusText}`);
		}

		const data: AirtableResponse = await response.json();
		allRecords = allRecords.concat(data.records);
		offset = data.offset;
	} while (offset);

	return allRecords;
}

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	if (!AIRTABLE_API_KEY) {
		throw error(400, 'AIRTABLE_API_KEY not configured');
	}

	try {
		const airtableItems = await fetchShopItemsFromAirtable();

		const existingItems = await db.select().from(shopItems);
		const existingByAirtableId = new Map(
			existingItems
				.filter((item) => item.airtableRecordId)
				.map((item) => [item.airtableRecordId!, item])
		);

		let created = 0;
		let updated = 0;
		let skipped = 0;

		for (const airtableItem of airtableItems) {
			const { name, description, imageUrl, price, usd_cost, type } = airtableItem.fields;

			if (!name || !description || !imageUrl || price === undefined) {
				skipped++;
				continue;
			}

			const itemData = {
				name,
				description,
				imageUrl,
				price,
				usd_cost: usd_cost ?? null,
				type: (type as 'hcb' | 'third_party' | null) ?? null,
				airtableRecordId: airtableItem.id
			};

			const existingItem = existingByAirtableId.get(airtableItem.id);

			if (existingItem) {
				await db.update(shopItems).set(itemData).where(eq(shopItems.id, existingItem.id));
				updated++;
			} else {
				await db.insert(shopItems).values(itemData);
				created++;
			}
		}

		return json({
			success: true,
			message: `Shop items synced from Airtable! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`,
			stats: {
				created,
				updated,
				skipped,
				total: airtableItems.length
			}
		});
	} catch (err) {
		console.error('Shop items sync error:', err);
		throw error(500, err instanceof Error ? err.message : 'Sync failed');
	}
};
