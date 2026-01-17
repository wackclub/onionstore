import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders, usersWithTokens, rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createOrderSchema } from '$lib/server/validation';
import { type } from 'arktype';
import { createShopOrderInAirtable, lookupAirtableShopItemByName } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();

		const result = createOrderSchema(body);
		if (result instanceof type.errors) {
			return json({ error: 'Invalid request', details: result.summary }, { status: 400 });
		}

		const { shopItemId } = result;

		const userId = locals.user?.id;
		if (!userId) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const shopItem = await db.select().from(shopItems).where(eq(shopItems.id, shopItemId)).limit(1);
		if (!shopItem.length) {
			return json({ error: 'Shop item not found' }, { status: 404 });
		}

		const item = shopItem[0];

		const userWithTokens = await db
			.select()
			.from(usersWithTokens)
			.where(eq(usersWithTokens.id, userId))
			.limit(1);
		if (!userWithTokens.length) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const user = userWithTokens[0];

		if (user.tokens < item.price) {
			return json(
				{
					error: 'Insufficient tokens',
					required: item.price,
					available: user.tokens
				},
				{ status: 400 }
			);
		}

		const remainingTokens = user.tokens - item.price;
		const newOrder = await db
			.insert(shopOrders)
			.values({
				shopItemId: item.id,
				priceAtOrder: item.price,
				userId: userId,
				status: 'pending'
			})
			.returning();

		syncOrderToAirtable(newOrder[0], item, user.email, userId);

		return json({
			success: true,
			order: newOrder[0],
			message: 'Order created successfully',
			remainingTokens
		});
	} catch (error) {
		console.error('Order creation error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

async function syncOrderToAirtable(
	order: typeof shopOrders.$inferSelect,
	item: typeof shopItems.$inferSelect,
	userEmail: string | null,
	postgresUserId: string
) {
	try {
		const [userRecord] = await db
			.select({ airtableSignupsRecordId: rawUsers.airtableSignupsRecordId })
			.from(rawUsers)
			.where(eq(rawUsers.id, postgresUserId));

		let shopItemAirtableId = item.airtableRecordId;
		if (!shopItemAirtableId) {
			shopItemAirtableId = await lookupAirtableShopItemByName(item.name);
			if (shopItemAirtableId) {
				await db
					.update(shopItems)
					.set({ airtableRecordId: shopItemAirtableId })
					.where(eq(shopItems.id, item.id));
			}
		}

		const airtableRecordId = await createShopOrderInAirtable({
			itemName: item.name,
			email: userEmail || '',
			postgresUserId: postgresUserId,
			userId: userRecord?.airtableSignupsRecordId ?? undefined,
			priceAtOrder: order.priceAtOrder,
			status: 'Pending',
			shopItemId: shopItemAirtableId ?? undefined
		});

		await db.update(shopOrders).set({ airtableRecordId }).where(eq(shopOrders.id, order.id));
	} catch (error) {
		console.error('Failed to sync order to Airtable:', error);
	}
}
