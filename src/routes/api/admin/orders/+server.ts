import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders, rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LOOPS_API_KEY } from '$env/static/private';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.user?.isAdmin) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		const { orderId, status, memo } = await request.json();

		if (!orderId || !status) {
			return json({ error: 'Order ID and status are required' }, { status: 400 });
		}

		if (!['fulfilled', 'rejected'].includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}
		const updateData: { status: string; memo?: string } = { status };
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

		const [user] = await db
			.select()
			.from(rawUsers)
			.where(eq(rawUsers.id, updatedOrder[0].userId));

		if (user?.email) {
			const [shopItem] = await db
				.select()
				.from(shopItems)
				.where(eq(shopItems.id, updatedOrder[0].shopItemId));
			const res = await fetch("https://app.loops.so/api/v1/transactional", {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${LOOPS_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					transactionalId: status === "fulfilled" ? "cmge904kq3fil070i2582g0yx" : "cmge93a9544ogzf0ijfkx26y3",
					email: user.email,
					dataVariables: {
						itemName: shopItem.name,
						orderId: updatedOrder[0].id.slice(0, 8),
						memo: memo || 'Unknown reason.',
					}
				})
			})
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
