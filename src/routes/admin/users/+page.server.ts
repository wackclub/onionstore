import { redirect } from '@sveltejs/kit';
import { db, usersWithTokens, shopOrders } from '$lib/server/db';
import { count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}

	// Get all users with their token counts
	const users = await db.select().from(usersWithTokens);

	const orderCounts = await db
		.select({
			userId: shopOrders.userId,
			orderCount: count(shopOrders.id).as('orderCount')
		})
		.from(shopOrders)
		.groupBy(shopOrders.userId);

	const orderCountByUser = new Map(orderCounts.map(({ userId, orderCount }) => [userId, Number(orderCount)]));
	const totalOrders = [...orderCountByUser.values()].reduce((sum, count) => sum + count, 0);

	return {
		users: users.map((user) => ({
			...user,
			orderCount: orderCountByUser.get(user.email) ?? 0
		})),
		totalOrders
	};
};
