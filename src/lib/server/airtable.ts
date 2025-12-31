const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appNasWZkM6JW1nj3';
const AIRTABLE_USERS_TABLE = 'tblpJEJAfy5rEc5vG';
const AIRTABLE_ORDERS_TABLE = 'tblOklDMe8jJPdOIq';
const AIRTABLE_SHOP_ITEMS_TABLE = 'tbltUSi4tZ5dtUylt';
const AIRTABLE_SUBMISSIONS_TABLE = 'tbl1qlhGJPoHRWgM3';

interface AirtableRecord {
	id: string;
	fields: Record<string, unknown>;
}

interface AirtableResponse {
	records: AirtableRecord[];
	offset?: string;
}

export async function fetchAirtableRecords(
	tableId: string,
	filterFormula?: string
): Promise<AirtableRecord[]> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY environment variable is required');
	}

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: AirtableRecord[] = [];
	let offset: string | undefined;

	do {
		const params = new URLSearchParams();
		if (filterFormula) params.set('filterByFormula', filterFormula);
		if (offset) params.set('offset', offset);

		const response = await fetch(`${url}?${params}`, { headers });
		if (!response.ok) {
			throw new Error(
				`Failed to fetch Airtable records: ${response.status} ${response.statusText}`
			);
		}

		const data: AirtableResponse = await response.json();
		allRecords = allRecords.concat(data.records);
		offset = data.offset;
	} while (offset);

	return allRecords;
}

export async function createAirtableRecord(
	tableId: string,
	fields: Record<string, unknown>
): Promise<AirtableRecord> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY environment variable is required');
	}

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}`;
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${AIRTABLE_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ fields })
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to create Airtable record: ${response.status} - ${error}`);
	}

	return response.json();
}

export async function updateAirtableRecord(
	tableId: string,
	recordId: string,
	fields: Record<string, unknown>
): Promise<AirtableRecord> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY environment variable is required');
	}

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}/${recordId}`;
	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${AIRTABLE_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ fields })
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to update Airtable record: ${response.status} - ${error}`);
	}

	return response.json();
}

export async function findAirtableRecordByField(
	tableId: string,
	fieldName: string,
	value: string
): Promise<AirtableRecord | null> {
	// Sanitize inputs to prevent formula injection
	const sanitizedFieldName = fieldName.replace(/[{}"']/g, '');
	const sanitizedValue = value.replace(/"/g, '\\"');
	const records = await fetchAirtableRecords(tableId, `{${sanitizedFieldName}} = "${sanitizedValue}"`);
	return records.length > 0 ? records[0] : null;
}

export interface ShopItemAirtableData {
	name: string;
	description: string;
	imageUrl: string;
	price: number;
	usdCost?: number | null;
	type?: 'hcb' | 'third_party' | null;
}

export async function syncShopItemToAirtable(
	data: ShopItemAirtableData,
	existingAirtableId?: string | null
): Promise<string> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY not set');
	}

	const fields: Record<string, unknown> = {
		name: data.name,
		description: data.description,
		imageUrl: data.imageUrl,
		price: data.price
	};

	if (data.usdCost != null) {
		fields['usd_cost'] = data.usdCost;
	}
	if (data.type) {
		fields['type'] = data.type;
	}

	if (existingAirtableId) {
		await updateAirtableRecord(AIRTABLE_SHOP_ITEMS_TABLE, existingAirtableId, fields);
		return existingAirtableId;
	} else {
		const record = await createAirtableRecord(AIRTABLE_SHOP_ITEMS_TABLE, fields);
		return record.id;
	}
}

export interface ShopOrderAirtableData {
	itemName: string;
	email: string;
	userAirtableId?: string | null;
	shopItemAirtableId?: string | null;
	priceAtOrder: number;
	status: string;
}

export async function syncShopOrderToAirtable(
	data: ShopOrderAirtableData,
	existingAirtableId?: string | null
): Promise<string> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY not set');
	}

	const fields: Record<string, unknown> = {
		'Item Name': data.itemName,
		Email: data.email,
		priceAtOrder: data.priceAtOrder,
		status: capitalizeFirst(data.status)
	};

	if (data.userAirtableId) {
		fields['userId'] = [data.userAirtableId];
	}
	if (data.shopItemAirtableId) {
		fields['shopItemId'] = [data.shopItemAirtableId];
	}

	if (existingAirtableId) {
		await updateAirtableRecord(AIRTABLE_ORDERS_TABLE, existingAirtableId, fields);
		return existingAirtableId;
	} else {
		const record = await createAirtableRecord(AIRTABLE_ORDERS_TABLE, fields);
		return record.id;
	}
}

function capitalizeFirst(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export {
	AIRTABLE_BASE_ID,
	AIRTABLE_USERS_TABLE,
	AIRTABLE_ORDERS_TABLE,
	AIRTABLE_SHOP_ITEMS_TABLE,
	AIRTABLE_SUBMISSIONS_TABLE
};
