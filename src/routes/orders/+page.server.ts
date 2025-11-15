import { db } from '$lib/server/db';
import { shopOrders, shopItems, rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const orders = await db
		.select({
			id: shopOrders.id,
			status: shopOrders.status,
			priceAtOrder: shopOrders.priceAtOrder,
			memo: shopOrders.memo,
			createdAt: shopOrders.createdAt,
			itemName: shopItems.name,
			itemImageUrl: shopItems.imageUrl,
			userId: rawUsers.id,
			userAvatarUrl: rawUsers.avatarUrl
		})
		.from(shopOrders)
		.leftJoin(shopItems, eq(shopOrders.shopItemId, shopItems.id))
		.leftJoin(rawUsers, eq(shopOrders.userId, rawUsers.id))
		.where(eq(shopOrders.userId, locals.user?.id))
		.orderBy(shopOrders.createdAt);

	return {
		orders
	};
};
