import { json, error } from '@sveltejs/kit';
import { db, shopOrders } from '$lib/server/db';
import { eq, isNotNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { AIRTABLE_BASE_ID, AIRTABLE_ORDERS_TABLE } from '$lib/server/airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

interface AirtableShopOrder {
	id: string;
	fields: {
		status?: string;
		[key: string]: unknown;
	};
}

interface AirtableResponse {
	records: AirtableShopOrder[];
	offset?: string;
}

async function fetchShopOrdersFromAirtable(): Promise<AirtableShopOrder[]> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY not configured');
	}

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_ORDERS_TABLE)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: AirtableShopOrder[] = [];
	let offset: string | undefined;

	do {
		const params = new URLSearchParams();
		if (offset) params.set('offset', offset);

		const response = await fetch(`${url}?${params}`, { headers });
		if (!response.ok) {
			throw new Error(`Failed to fetch shop orders: ${response.status} ${response.statusText}`);
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
		const airtableOrders = await fetchShopOrdersFromAirtable();

		const localOrders = await db
			.select()
			.from(shopOrders)
			.where(isNotNull(shopOrders.airtableRecordId));

		const airtableOrderMap = new Map(airtableOrders.map((o) => [o.id, o]));

		let updated = 0;
		let skipped = 0;

		for (const localOrder of localOrders) {
			if (!localOrder.airtableRecordId) continue;

			const airtableOrder = airtableOrderMap.get(localOrder.airtableRecordId);

			if (!airtableOrder) {
				skipped++;
				continue;
			}

			const airtableStatus = airtableOrder.fields.status?.toLowerCase();

			let newStatus: 'pending' | 'approved' | 'rejected' | null = null;
			if (airtableStatus === 'pending') {
				newStatus = 'pending';
			} else if (airtableStatus === 'approved') {
				newStatus = 'approved';
			} else if (airtableStatus === 'rejected') {
				newStatus = 'rejected';
			}

			if (newStatus && newStatus !== localOrder.status) {
				await db
					.update(shopOrders)
					.set({ status: newStatus })
					.where(eq(shopOrders.id, localOrder.id));
				updated++;
			}
		}

		return json({
			success: true,
			message: `Shop orders synced! Updated: ${updated}, Skipped: ${skipped}`,
			stats: {
				updated,
				skipped,
				total: localOrders.length
			}
		});
	} catch (err) {
		console.error('Shop orders sync error:', err);
		throw error(500, err instanceof Error ? err.message : 'Sync failed');
	}
};
