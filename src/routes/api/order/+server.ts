import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders, usersWithTokens, rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { syncShopOrderToAirtable } from '$lib/server/airtable';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { shopItemId } = await request.json();

		if (!shopItemId) {
			return json({ error: 'Shop item ID is required' }, { status: 400 });
		}

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

		// Get user's airtableRecordId for linking
		const [rawUser] = await db.select().from(rawUsers).where(eq(rawUsers.id, userId)).limit(1);

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

		// Sync to Airtable and store the record ID
		syncShopOrderToAirtable({
			itemName: item.name,
			email: user.email!,
			userAirtableId: rawUser?.airtableRecordId,
			shopItemAirtableId: item.airtableRecordId,
			priceAtOrder: item.price,
			status: 'pending'
		})
			.then(async (airtableId) => {
				await db
					.update(shopOrders)
					.set({ airtableRecordId: airtableId })
					.where(eq(shopOrders.id, newOrder[0].id));
			})
			.catch((err) => console.error('Airtable sync failed:', err));

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
