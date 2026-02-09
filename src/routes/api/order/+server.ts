import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders, rawUsers, payouts } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
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

		// Use transaction with serializable isolation to prevent race conditions
		const orderResult = await db.transaction(async (tx) => {
			// Lock the user's row and calculate token balance atomically
			const userWithTokens = await tx
				.select({
					id: rawUsers.id,
					email: rawUsers.email,
					tokens: sql<number>`
						(GREATEST(
							COALESCE(
								(SELECT SUM(tokens) FROM ${payouts} WHERE "userId" = ${rawUsers.id}),
								0
							) -
							COALESCE(
								(SELECT SUM("priceAtOrder") FROM ${shopOrders} WHERE "userId" = ${rawUsers.id} AND status IN ('pending', 'approved')),
								0
							),
							0
						))::int
					`.as('tokens')
				})
				.from(rawUsers)
				.where(eq(rawUsers.id, userId))
				.for('update')
				.limit(1);

			if (!userWithTokens.length) {
				return { error: 'User not found', status: 404 };
			}

			const user = userWithTokens[0];

			// Lock the shop item row
			const shopItem = await tx
				.select()
				.from(shopItems)
				.where(eq(shopItems.id, shopItemId))
				.for('update')
				.limit(1);

			if (!shopItem.length) {
				return { error: 'Shop item not found', status: 404 };
			}

			const item = shopItem[0];

			if (user.tokens < item.price) {
				return {
					error: 'Insufficient tokens',
					status: 400,
					details: {
						required: item.price,
						available: user.tokens
					}
				};
			}

			const remainingTokens = user.tokens - item.price;
			const newOrder = await tx
				.insert(shopOrders)
				.values({
					shopItemId: item.id,
					priceAtOrder: item.price,
					userId: userId,
					status: 'pending'
				})
				.returning();

			return {
				success: true,
				order: newOrder[0],
				remainingTokens,
				userEmail: user.email,
				item
			};
		});

		if ('error' in orderResult) {
			return json(
				{ error: orderResult.error, ...(orderResult.details || {}) },
				{ status: orderResult.status }
			);
		}

		syncOrderToAirtable(orderResult.order, orderResult.item, orderResult.userEmail, userId);

		return json({
			success: true,
			order: orderResult.order,
			message: 'Order created successfully',
			remainingTokens: orderResult.remainingTokens
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
