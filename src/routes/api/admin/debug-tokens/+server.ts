import { json, error } from '@sveltejs/kit';
import { db, payouts, shopOrders, rawUsers } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	try {
		// Get the admin user's data
		const user = await db.select().from(rawUsers).where(eq(rawUsers.email, locals.user.email)).limit(1);

		if (user.length === 0) {
			throw error(404, 'User not found');
		}

		// Get all payouts
		const allPayouts = await db.select().from(payouts).where(eq(payouts.userId, user[0].id));

		// Get all orders
		const allOrders = await db.select().from(shopOrders).where(eq(shopOrders.userId, user[0].id));

		// Calculate tokens manually
		const totalEarned = allPayouts.reduce((sum, p) => sum + p.tokens, 0);
		const totalSpent = allOrders
			.filter(o => o.status === 'pending' || o.status === 'approved')
			.reduce((sum, o) => sum + o.priceAtOrder, 0);
		const tokensRemaining = Math.max(totalEarned - totalSpent, 0);

		return json({
			user: user[0],
			payouts: allPayouts,
			orders: allOrders,
			calculation: {
				totalEarned,
				totalSpent,
				tokensRemaining
			}
		});
	} catch (err) {
		console.error('Debug tokens error:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to debug tokens');
	}
};
