import { json, error } from '@sveltejs/kit';
import { db, payouts, rawUsers, shopItems, shopOrders } from '$lib/server/db';
import { eq, isNotNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE, AIRTABLE_SHOP_ITEMS_TABLE, AIRTABLE_SUBMISSIONS_TABLE } from '$lib/server/airtable';
import { CRON_SECRET, AIRTABLE_API_KEY } from '$env/static/private';

const AIRTABLE_SHOP_ORDERS_TABLE = 'tblOklDMe8jJPdOIq';

interface AirtableResponse {
	records: any[];
	offset?: string;
}

async function fetchAirtableRecords(tableId: string, filterFormula?: string): Promise<any[]> {
	if (!AIRTABLE_API_KEY) throw new Error('AIRTABLE_API_KEY not configured');

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: any[] = [];
	let offset: string | undefined;

	do {
		const params = new URLSearchParams();
		if (filterFormula) params.set('filterByFormula', filterFormula);
		if (offset) params.set('offset', offset);

		const response = await fetch(`${url}?${params}`, { headers });
		if (!response.ok) throw new Error(`Failed to fetch from ${tableId}: ${response.statusText}`);

		const data: AirtableResponse = await response.json();
		allRecords = allRecords.concat(data.records);
		offset = data.offset;
	} while (offset);

	return allRecords;
}

function parsePoints(pointsField: string | number | undefined): number {
	if (!pointsField) return 0;
	if (typeof pointsField === 'number') return pointsField;
	const parsed = parseInt(pointsField, 10);
	return isNaN(parsed) ? 0 : parsed;
}

export const GET: RequestHandler = async ({ request }) => {
	// Verify the request is from Vercel Cron or contains the secret
	const authHeader = request.headers.get('authorization');

	if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
		throw error(401, 'Unauthorized');
	}

	if (!AIRTABLE_API_KEY) {
		throw error(400, 'AIRTABLE_API_KEY not configured');
	}

	const results = {
		users: { created: 0, updated: 0 },
		submissions: { created: 0, updated: 0, deleted: 0 },
		shopItems: { created: 0, updated: 0 },
		shopOrders: { updated: 0 }
	};

	try {
		// 1. Sync Users from Airtable
		const airtableUsers = await fetchAirtableRecords(AIRTABLE_USERS_TABLE);

		for (const record of airtableUsers) {
			const email = record.fields.Email?.toLowerCase().trim();
			if (!email) continue;

			const existingUsers = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

			const userData = {
				email,
				displayName: record.fields['Display Name'] || record.fields.Email,
				isAdmin: record.fields.idAdmin === true,
				totalEarnedPoints: record.fields['Total Earned Points'] || 0,
				pointsRedeemed: record.fields['Points Redeemed'] || 0,
				airtableRecordId: record.id,
				addressLine1: record.fields['Address Line 1'] || null,
				addressLine2: record.fields['Address Line 2'] || null,
				city: record.fields.City || null,
				state: record.fields.State || null,
				zipPostal: record.fields['Zip/Postal'] || null,
				shippingCountry: record.fields['Shipping Country'] || null
			};

			if (existingUsers.length > 0) {
				await db.update(rawUsers).set(userData).where(eq(rawUsers.email, email));
				results.users.updated++;
			} else {
				await db.insert(rawUsers).values(userData);
				results.users.created++;
			}
		}

		// 2. Sync Submissions (Ratings → Tokens)
		const submissions = await fetchAirtableRecords(AIRTABLE_SUBMISSIONS_TABLE, '{Review} = "Approved"');
		const existingPayouts = await db.select().from(payouts).where(isNotNull(payouts.airtableSubmissionId));
		const existingPayoutMap = new Map(existingPayouts.map((p) => [p.airtableSubmissionId, p]));
		const seenSubmissionIds = new Set<string>();

		for (const submission of submissions) {
			const email = submission.fields.filloutemail?.toLowerCase().trim();
			seenSubmissionIds.add(submission.id);
			if (!email) continue;

			const user = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);
			if (user.length === 0) continue;

			const tokens = parsePoints(submission.fields.Points);
			const challengeName = submission.fields['Challenge (from Challenge)']?.[0] ?? 'Submission';
			const projectName = submission.fields.Name ?? 'Unknown';
			const memo = `${challengeName}: ${projectName}`;

			const existingPayout = existingPayoutMap.get(submission.id);

			if (existingPayout) {
				if (existingPayout.tokens !== tokens || existingPayout.memo !== memo) {
					await db.update(payouts).set({ tokens, memo, userId: user[0].id })
						.where(eq(payouts.airtableSubmissionId, submission.id));
					results.submissions.updated++;
				}
			} else {
				await db.insert(payouts).values({
					tokens,
					userId: user[0].id,
					memo,
					airtableSubmissionId: submission.id
				});
				results.submissions.created++;
			}
		}

		// Delete payouts for submissions that are no longer approved
		for (const [submissionId, payout] of existingPayoutMap) {
			if (!seenSubmissionIds.has(submissionId!)) {
				await db.delete(payouts).where(eq(payouts.id, payout.id));
				results.submissions.deleted++;
			}
		}

		// 3. Sync Shop Items from Airtable
		const airtableItems = await fetchAirtableRecords(AIRTABLE_SHOP_ITEMS_TABLE);
		const existingItems = await db.select().from(shopItems);
		const existingByAirtableId = new Map(
			existingItems.filter((item) => item.airtableRecordId).map((item) => [item.airtableRecordId!, item])
		);

		for (const airtableItem of airtableItems) {
			const { name, description, imageUrl, price, usd_cost, type } = airtableItem.fields;
			if (!name || !description || !imageUrl || price === undefined) continue;

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
				results.shopItems.updated++;
			} else {
				await db.insert(shopItems).values(itemData);
				results.shopItems.created++;
			}
		}

		// 4. Sync Shop Orders from Airtable
		const airtableOrders = await fetchAirtableRecords(AIRTABLE_SHOP_ORDERS_TABLE);
		const localOrders = await db.select().from(shopOrders).where(isNotNull(shopOrders.airtableRecordId));
		const airtableOrderMap = new Map(airtableOrders.map((o) => [o.id, o]));

		for (const localOrder of localOrders) {
			if (!localOrder.airtableRecordId) continue;

			const airtableOrder = airtableOrderMap.get(localOrder.airtableRecordId);
			if (!airtableOrder) continue;

			const airtableStatus = airtableOrder.fields.status?.toLowerCase();
			let newStatus: 'pending' | 'approved' | 'rejected' | null = null;

			if (airtableStatus === 'pending') newStatus = 'pending';
			else if (airtableStatus === 'approved') newStatus = 'approved';
			else if (airtableStatus === 'rejected') newStatus = 'rejected';

			if (newStatus && newStatus !== localOrder.status) {
				await db.update(shopOrders).set({ status: newStatus })
					.where(eq(shopOrders.id, localOrder.id));
				results.shopOrders.updated++;
			}
		}

		return json({
			success: true,
			message: 'All sync operations completed successfully',
			timestamp: new Date().toISOString(),
			results
		});
	} catch (err) {
		console.error('Cron sync error:', err);
		throw error(500, err instanceof Error ? err.message : 'Sync failed');
	}
};
