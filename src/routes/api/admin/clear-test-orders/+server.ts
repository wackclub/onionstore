import { json, error } from '@sveltejs/kit';
import { db, shopOrders } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	try {
		// Delete all orders for the admin user
		const deleted = await db
			.delete(shopOrders)
			.where(eq(shopOrders.userId, locals.user.id))
			.returning();

		return json({
			success: true,
			message: `Deleted ${deleted.length} orders`,
			deletedOrders: deleted
		});
	} catch (err) {
		console.error('Clear orders error:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to clear orders');
	}
};
