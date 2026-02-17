import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { shopOrders, shopItems, rawUsers } from '../src/lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const HCBAPI_KEY = process.env.HCBAPI_KEY;
const HCB_ORG_ID = process.env.HCB_ORG_ID || 'org_WKudDQ';

if (!DATABASE_URL) {
	console.error('DATABASE_URL environment variable is required');
	process.exit(1);
}

if (!HCBAPI_KEY) {
	console.error('HCBAPI_KEY environment variable is required');
	process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

interface GrantRequest {
	email: string;
	amount_cents: number;
	merchant_lock: string | null;
	category_lock: string | null;
	keyword_lock: string | null;
	purpose: string | null;
}

interface OrderWithDetails {
	orderId: string;
	userId: string;
	email: string;
	itemId: string;
	itemName: string;
	usdCost: number;
	hcbMids: string[] | null;
	hcbCategoryLock: string[] | null;
	hcbIsPreauth: boolean;
	hcbPurpose: string | null;
}

async function createCardGrant(
	grant: GrantRequest
): Promise<{ success: boolean; data?: unknown; error?: string }> {
	const url = `https://hcbapi.skyfall.dev/api/v4/organizations/${HCB_ORG_ID}/card_grants`;

	const body = {
		amount_cents: grant.amount_cents,
		email: grant.email,
		merchant_lock: grant.merchant_lock,
		category_lock: grant.category_lock,
		keyword_lock: grant.keyword_lock,
		purpose: grant.purpose
	};

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${HCBAPI_KEY}`
			},
			body: JSON.stringify(body)
		});

		const data = await response.json();

		if (!response.ok) {
			return { success: false, error: `HTTP ${response.status}: ${JSON.stringify(data)}` };
		}

		return { success: true, data };
	} catch (error) {
		return { success: false, error: String(error) };
	}
}

async function getPendingHcbOrders(): Promise<OrderWithDetails[]> {
	const orders = await db
		.select({
			orderId: shopOrders.id,
			userId: shopOrders.userId,
			email: rawUsers.email,
			itemId: shopItems.id,
			itemName: shopItems.name,
			usdCost: shopItems.usd_cost,
			hcbMids: shopItems.hcbMids,
			hcbCategoryLock: shopItems.hcbCategoryLock,
			hcbIsPreauth: shopItems.hcbIsPreauth,
			hcbPurpose: shopItems.hcbPurpose
		})
		.from(shopOrders)
		.innerJoin(shopItems, eq(shopOrders.shopItemId, shopItems.id))
		.innerJoin(rawUsers, eq(shopOrders.userId, rawUsers.id))
		.where(and(eq(shopOrders.status, 'pending'), eq(shopItems.type, 'hcb')));

	return orders.filter((o) => o.usdCost !== null) as OrderWithDetails[];
}

async function markOrdersApproved(orderIds: string[]) {
	if (orderIds.length === 0) return;

	await db
		.update(shopOrders)
		.set({ status: 'approved' })
		.where(and(eq(shopOrders.status, 'pending'), inArray(shopOrders.id, orderIds)));
}

interface GroupedGrant {
	email: string;
	itemId: string;
	itemName: string;
	totalCents: number;
	orderIds: string[];
	hcbMids: string[] | null;
	hcbCategoryLock: string[] | null;
	hcbIsPreauth: boolean;
	hcbPurpose: string | null;
}

function groupOrders(orders: OrderWithDetails[]): GroupedGrant[] {
	const grouped = new Map<string, GroupedGrant>();

	for (const order of orders) {
		const key = `${order.email}:${order.itemId}`;

		if (grouped.has(key)) {
			const existing = grouped.get(key)!;
			existing.totalCents += order.usdCost * 100;
			existing.orderIds.push(order.orderId);
		} else {
			grouped.set(key, {
				email: order.email,
				itemId: order.itemId,
				itemName: order.itemName,
				totalCents: order.usdCost * 100,
				orderIds: [order.orderId],
				hcbMids: order.hcbMids,
				hcbCategoryLock: order.hcbCategoryLock,
				hcbIsPreauth: order.hcbIsPreauth,
				hcbPurpose: order.hcbPurpose
			});
		}
	}

	return Array.from(grouped.values());
}

async function main() {
	console.log('Fetching pending HCB orders...');
	const orders = await getPendingHcbOrders();
	console.log(`Found ${orders.length} pending HCB orders`);

	if (orders.length === 0) {
		console.log('No orders to process');
		await pool.end();
		process.exit(0);
	}

	const grouped = groupOrders(orders);
	console.log(`Grouped into ${grouped.length} grants to create`);

	let successCount = 0;
	let errorCount = 0;

	for (const grant of grouped) {
		const grantRequest: GrantRequest = {
			email: grant.email,
			amount_cents: grant.totalCents,
			merchant_lock: grant.hcbMids?.join(',') || null,
			category_lock: grant.hcbCategoryLock?.join(',') || null,
			keyword_lock: grant.hcbIsPreauth ? 'preauth' : null,
			purpose: grant.hcbPurpose?.slice(0, 30) || null
		};

		console.log(`\nCreating grant for ${grant.email}:`);
		console.log(`  Item: ${grant.itemName}`);
		console.log(
			`  Amount: $${(grant.totalCents / 100).toFixed(2)} (${grant.orderIds.length} order(s))`
		);
		console.log(`  Merchant lock: ${grantRequest.merchant_lock || 'none'}`);
		console.log(`  Category lock: ${grantRequest.category_lock || 'none'}`);
		console.log(`  Preauth: ${grant.hcbIsPreauth}`);
		console.log(`  Purpose: ${grantRequest.purpose || 'none'}`);

		const result = await createCardGrant(grantRequest);

		if (result.success) {
			await markOrdersApproved(grant.orderIds);
			console.log(`  ✓ Grant created successfully`);
			console.log(`  ✓ Marked ${grant.orderIds.length} order(s) as approved`);
			successCount++;
		} else {
			console.error(`  ✗ Failed: ${result.error}`);
			errorCount++;
		}
	}

	console.log(`\n--- Summary ---`);
	console.log(`Success: ${successCount}`);
	console.log(`Errors: ${errorCount}`);

	await pool.end();
	process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
