import { env } from '$env/dynamic/private';

const AIRTABLE_BASE_ID = 'appNasWZkM6JW1nj3';
const SHOP_ITEMS_TABLE_ID = 'tbltUSi4tZ5dtUylt';

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
