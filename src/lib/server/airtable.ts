import { env } from '$env/dynamic/private';

const AIRTABLE_BASE_ID = 'appNasWZkM6JW1nj3';
const SHOP_ITEMS_TABLE_ID = 'tbltUSi4tZ5dtUylt';
const SIGNUPS_TABLE_ID = 'tblpJEJAfy5rEc5vG';
const SHOP_ORDERS_TABLE_ID = 'tblOklDMe8jJPdOIq';
const SUBMISSIONS_TABLE_ID = 'tbl1qlhGJPoHRWgM3';
const SUBMISSIONS_APPROVED_VIEW_ID = 'viwcZzARJrHGmMZxD';

interface ShopItemData {
	name: string;
	description: string;
	imageUrl: string;
	price: number;
	usd_cost: number | null;
	type: 'hcb' | 'third_party' | null;
}

export async function syncShopItemToAirtable(item: ShopItemData): Promise<void> {
	if (!env.AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY is not configured');
	}

	const response = await fetch(
		`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SHOP_ITEMS_TABLE_ID}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				fields: {
					name: item.name,
					description: item.description,
					imageUrl: item.imageUrl,
					price: item.price,
					usd_cost: item.usd_cost,
					type: item.type
				}
			})
		}
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to sync shop item to Airtable: ${error}`);
	}
}

export async function lookupAirtableSignupByEmail(email: string): Promise<string | null> {
	if (!env.AIRTABLE_API_KEY) {
		console.error('AIRTABLE_API_KEY is not configured');
		return null;
	}

	const filterFormula = encodeURIComponent(`{filloutemail}="${email}"`);
	const response = await fetch(
		`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SIGNUPS_TABLE_ID}?filterByFormula=${filterFormula}&maxRecords=1`,
		{
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_API_KEY}`
			}
		}
	);

	if (!response.ok) {
		console.error('Failed to lookup Airtable signup:', await response.text());
		return null;
	}

	const data = await response.json();
	return data.records?.[0]?.id || null;
}

export async function lookupAirtableShopItemByName(name: string): Promise<string | null> {
	if (!env.AIRTABLE_API_KEY) {
		console.error('AIRTABLE_API_KEY is not configured');
		return null;
	}

	const filterFormula = encodeURIComponent(`{name}="${name}"`);
	const response = await fetch(
		`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SHOP_ITEMS_TABLE_ID}?filterByFormula=${filterFormula}&maxRecords=1`,
		{
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_API_KEY}`
			}
		}
	);

	if (!response.ok) {
		console.error('Failed to lookup Airtable shop item:', await response.text());
		return null;
	}

	const data = await response.json();
	return data.records?.[0]?.id || null;
}

type AirtableOrderStatus = 'Pending' | 'Approved' | 'Rejected';

interface CreateShopOrderData {
	itemName: string;
	email: string;
	postgresUserId: string;
	userId?: string;
	priceAtOrder: number;
	status: AirtableOrderStatus;
	shopItemId?: string;
}

export async function createShopOrderInAirtable(data: CreateShopOrderData): Promise<string> {
	if (!env.AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY is not configured');
	}

	const fields: Record<string, unknown> = {
		'Item Name': data.itemName,
		Email: data.email,
		postgresUserId: data.postgresUserId,
		priceAtOrder: data.priceAtOrder,
		status: data.status
	};

	if (data.userId) {
		fields['userId'] = [data.userId];
	}

	if (data.shopItemId) {
		fields['shopItemId'] = [data.shopItemId];
	}

	const response = await fetch(
		`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SHOP_ORDERS_TABLE_ID}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ fields })
		}
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create shop order in Airtable: ${error}`);
	}

	const result = await response.json();
	return result.id;
}

interface UpdateShopOrderData {
	status?: AirtableOrderStatus;
	userId?: string;
}

export async function updateShopOrderInAirtable(
	recordId: string,
	data: UpdateShopOrderData
): Promise<void> {
	if (!env.AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY is not configured');
	}

	const fields: Record<string, unknown> = {};

	if (data.status) {
		fields['status'] = data.status;
	}

	if (data.userId) {
		fields['userId'] = [data.userId];
	}

	if (Object.keys(fields).length === 0) {
		return;
	}

	const response = await fetch(
		`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SHOP_ORDERS_TABLE_ID}/${recordId}`,
		{
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ fields })
		}
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update shop order in Airtable: ${error}`);
	}
}

interface BatchUpdateRecord {
	recordId: string;
	fields: { userId?: string };
}

export async function batchUpdateShopOrdersInAirtable(updates: BatchUpdateRecord[]): Promise<void> {
	if (!env.AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY is not configured');
	}

	if (updates.length === 0) {
		return;
	}

	const batches: BatchUpdateRecord[][] = [];
	for (let i = 0; i < updates.length; i += 10) {
		batches.push(updates.slice(i, i + 10));
	}

	for (const batch of batches) {
		const records = batch.map((update) => ({
			id: update.recordId,
			fields: {
				...(update.fields.userId && { userId: [update.fields.userId] })
			}
		}));

		const response = await fetch(
			`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SHOP_ORDERS_TABLE_ID}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ records })
			}
		);

		if (!response.ok) {
			const error = await response.text();
			console.error(`Failed to batch update shop orders in Airtable: ${error}`);
		}
	}
}

export async function getAllAirtableShopItems(): Promise<Array<{
	id: string;
	name: string;
}> | null> {
	if (!env.AIRTABLE_API_KEY) {
		console.error('AIRTABLE_API_KEY is not configured');
		return null;
	}

	const allRecords: Array<{ id: string; name: string }> = [];
	let offset: string | undefined;

	do {
		const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SHOP_ITEMS_TABLE_ID}`);
		url.searchParams.set('fields[]', 'name');
		if (offset) {
			url.searchParams.set('offset', offset);
		}

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_API_KEY}`
			}
		});

		if (!response.ok) {
			console.error('Failed to fetch Airtable shop items:', await response.text());
			return null;
		}

		const data = await response.json();
		for (const record of data.records) {
			allRecords.push({ id: record.id, name: record.fields.name });
		}
		offset = data.offset;
	} while (offset);

	return allRecords;
}

export interface AirtableSubmission {
	recordId: string;
	email: string;
	tokens: number;
	name: string;
	challenge: string;
}

export async function fetchApprovedSubmissions(): Promise<AirtableSubmission[]> {
	if (!env.AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY is not configured');
	}

	const allSubmissions: AirtableSubmission[] = [];
	let offset: string | undefined;

	do {
		const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SUBMISSIONS_TABLE_ID}`);
		url.searchParams.set('view', SUBMISSIONS_APPROVED_VIEW_ID);
		if (offset) {
			url.searchParams.set('offset', offset);
		}

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${env.AIRTABLE_API_KEY}`
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to fetch approved submissions: ${error}`);
		}

		const data = await response.json();

		for (const record of data.records) {
			const fields = record.fields;

			const email = fields['filloutemail']?.trim().toLowerCase();
			if (!email) continue;

			const ratingArray = fields['Rating'] as string[] | undefined;
			const tokens = ratingArray?.[0] ? parseInt(ratingArray[0], 10) : 0;
			if (tokens === 0) continue;

			const challengeArray = fields['Challenge (from Challenge)'] as string[] | undefined;
			const challenge = challengeArray?.join(', ') || 'Submission';

			allSubmissions.push({
				recordId: record.id,
				email,
				tokens,
				name: fields['Name'] || 'Unknown',
				challenge
			});
		}

		offset = data.offset;
	} while (offset);

	return allSubmissions;
}
