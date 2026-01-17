import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders, rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LOOPS_API_KEY } from '$env/static/private';
import { updateOrderSchema } from '$lib/server/validation';
import { ArkErrors } from 'arktype';
import { updateShopOrderInAirtable } from '$lib/server/airtable';

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

		if (updatedOrder[0].airtableRecordId) {
			syncOrderStatusToAirtable(
				updatedOrder[0].airtableRecordId,
				status === 'approved' ? 'Approved' : 'Rejected'
			);
		}

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

async function syncOrderStatusToAirtable(
	airtableRecordId: string,
	status: 'Approved' | 'Rejected'
) {
	try {
		await updateShopOrderInAirtable(airtableRecordId, { status });
	} catch (error) {
		console.error('Failed to sync order status to Airtable:', error);
	}
}
