import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders, usersWithTokens, rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	syncShopOrderToAirtable,
	AIRTABLE_BASE_ID,
	AIRTABLE_USERS_TABLE
} from '$lib/server/airtable';
import { createOrderSchema } from '$lib/server/validation';
import { type } from 'arktype';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

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

				if (AIRTABLE_API_KEY && rawUser?.airtableRecordId) {
					const newPointsRedeemed = (rawUser.pointsRedeemed || 0) + item.price;
					await db
						.update(rawUsers)
						.set({ pointsRedeemed: newPointsRedeemed })
						.where(eq(rawUsers.id, userId));

					try {
						await fetch(
							`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_USERS_TABLE}/${rawUser.airtableRecordId}`,
							{
								method: 'PATCH',
								headers: {
									Authorization: `Bearer ${AIRTABLE_API_KEY}`,
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									fields: {
										'Points Redeemed': newPointsRedeemed
									}
								})
							}
						);
					} catch (err) {
						console.error('Failed to update Points Redeemed in Airtable:', err);
					}
				}
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
