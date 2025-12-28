import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders, rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LOOPS_API_KEY } from '$env/static/private';
import { syncShopOrderToAirtable } from '$lib/server/airtable';
import { updateOrderSchema } from '$lib/server/validation';
import { ArkErrors } from 'arktype';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user?.isAdmin) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		const body = await request.json();
		const parsed = updateOrderSchema(body);

		if (parsed instanceof ArkErrors) {
			return json({ error: parsed.summary }, { status: 400 });
		}

		const { orderId, status, memo } = parsed;

		const updateData: { status: 'approved' | 'rejected'; memo?: string } = { status };
		if (memo !== undefined) {
			updateData.memo = memo;
		}

		const updatedOrder = await db
			.update(shopOrders)
			.set(updateData)
			.where(eq(shopOrders.id, orderId))
			.returning();

		if (!updatedOrder.length) {
			return json({ error: 'Order not found' }, { status: 404 });
		}

		const [user] = await db.select().from(rawUsers).where(eq(rawUsers.id, updatedOrder[0].userId));

		const [shopItem] = await db
			.select()
			.from(shopItems)
			.where(eq(shopItems.id, updatedOrder[0].shopItemId));

		syncShopOrderToAirtable(
			{
				itemName: shopItem.name,
				email: user?.email ?? '',
				userAirtableId: user?.airtableRecordId,
				shopItemAirtableId: shopItem.airtableRecordId,
				priceAtOrder: updatedOrder[0].priceAtOrder,
				status: status
			},
			updatedOrder[0].airtableRecordId
		)
			.then(async (airtableId) => {
				if (!updatedOrder[0].airtableRecordId) {
					await db
						.update(shopOrders)
						.set({ airtableRecordId: airtableId })
						.where(eq(shopOrders.id, updatedOrder[0].id));
				}
			})
			.catch((err) => console.error('Airtable sync failed:', err));

		if (user?.email) {
			const res = await fetch('https://app.loops.so/api/v1/transactional', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${LOOPS_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					transactionalId:
						status === 'approved' ? 'cmge904kq3fil070i2582g0yx' : 'cmge93a9544ogzf0ijfkx26y3',
					email: user.email,
					dataVariables: {
						itemName: shopItem.name,
						orderId: updatedOrder[0].id.slice(0, 8),
						memo: memo || 'Unknown reason.'
					}
				})
			});
			if (!res.ok) {
				console.error('Failed to send email notification:', await res.text());
			}
		}

		return json({
			success: true,
			order: updatedOrder[0],
			message: `Order ${status} successfully`
		});
	} catch (error) {
		console.error('Order update error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
