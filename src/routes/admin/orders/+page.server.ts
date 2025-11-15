import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { shopOrders, shopItems, rawUsers } from '$lib/server/db/schema';
import { eq, and, gte, lte, ilike, desc, asc, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}

	// Extract query parameters for filtering and sorting
	const statusFilter = url.searchParams.get('status');
	const customerFilter = url.searchParams.get('customer');
	const itemFilter = url.searchParams.get('item');
	const typeFilter = url.searchParams.get('type');
	const countryFilter = url.searchParams.get('country');
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const minPrice = url.searchParams.get('minPrice');
	const maxPrice = url.searchParams.get('maxPrice');
	const sortBy = url.searchParams.get('sortBy') || 'createdAt';
	const sortOrder = url.searchParams.get('sortOrder') || 'desc';

	// Build where conditions
	const conditions = [];

	if (statusFilter && statusFilter !== 'all') {
		conditions.push(eq(shopOrders.status, statusFilter as any));
	}

	if (customerFilter) {
		conditions.push(
			or(
				ilike(rawUsers.email, `%${customerFilter}%`),
				ilike(rawUsers.displayName, `%${customerFilter}%`)
			)
		);
	}

	if (itemFilter) {
		conditions.push(ilike(shopItems.name, `%${itemFilter}%`));
	}

	if (typeFilter && typeFilter !== 'all') {
		conditions.push(eq(shopItems.type, typeFilter as any));
	}

	if (startDate) {
		conditions.push(gte(shopOrders.createdAt, new Date(startDate)));
	}

	if (endDate) {
		const endDateObj = new Date(endDate);
		endDateObj.setHours(23, 59, 59, 999); // End of day
		conditions.push(lte(shopOrders.createdAt, endDateObj));
	}

	if (minPrice) {
		conditions.push(gte(shopOrders.priceAtOrder, parseInt(minPrice)));
	}

	if (maxPrice) {
		conditions.push(lte(shopOrders.priceAtOrder, parseInt(maxPrice)));
	}

	if (countryFilter && countryFilter !== 'all') {
		conditions.push(eq(rawUsers.country, countryFilter));
	}

	// Build order by clause
	let orderByClause;
	const isDesc = sortOrder === 'desc';

	switch (sortBy) {
		case 'price':
			orderByClause = isDesc ? desc(shopOrders.priceAtOrder) : asc(shopOrders.priceAtOrder);
			break;
		case 'status':
			orderByClause = isDesc ? desc(shopOrders.status) : asc(shopOrders.status);
			break;
		case 'customer':
			orderByClause = isDesc ? desc(rawUsers.displayName) : asc(rawUsers.displayName);
			break;
		case 'item':
			orderByClause = isDesc ? desc(shopItems.name) : asc(shopItems.name);
			break;
		case 'createdAt':
		default:
			orderByClause = isDesc ? desc(shopOrders.createdAt) : asc(shopOrders.createdAt);
			break;
	}

	const orders = await db
		.select({
			id: shopOrders.id,
			status: shopOrders.status,
			priceAtOrder: shopOrders.priceAtOrder,
			memo: shopOrders.memo,
			createdAt: shopOrders.createdAt,
			itemName: shopItems.name,
			itemImageUrl: shopItems.imageUrl,
			itemType: shopItems.type,
			userId: rawUsers.id,
			userEmail: rawUsers.email,
			userDisplayName: rawUsers.displayName,
			userAvatarUrl: rawUsers.avatarUrl,
			userCountry: rawUsers.country
		})
		.from(shopOrders)
		.leftJoin(shopItems, eq(shopOrders.shopItemId, shopItems.id))
		.leftJoin(rawUsers, eq(shopOrders.userId, rawUsers.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.orderBy(orderByClause);

	// Get filter options for dropdowns
	const allOrders = await db
		.select({
			status: shopOrders.status,
			priceAtOrder: shopOrders.priceAtOrder,
			itemName: shopItems.name,
			userEmail: rawUsers.email,
			userDisplayName: rawUsers.displayName,
			userCountry: rawUsers.country
		})
		.from(shopOrders)
		.leftJoin(shopItems, eq(shopOrders.shopItemId, shopItems.id))
		.leftJoin(rawUsers, eq(shopOrders.userId, rawUsers.id));

	const uniqueCustomers = [
		...new Set(allOrders.map((o) => o.userDisplayName || o.userEmail).filter(Boolean))
	].sort();
	const uniqueItems = [...new Set(allOrders.map((o) => o.itemName).filter(Boolean))].sort();
	const uniqueCountries = [...new Set(allOrders.map((o) => o.userCountry).filter(Boolean))].sort();
	const priceRange = {
		min: Math.min(...allOrders.map((o) => o.priceAtOrder)),
		max: Math.max(...allOrders.map((o) => o.priceAtOrder))
	};

	return {
		orders,
		filters: {
			status: statusFilter,
			customer: customerFilter,
			item: itemFilter,
			type: typeFilter,
			country: countryFilter,
			startDate,
			endDate,
			minPrice,
			maxPrice,
			sortBy,
			sortOrder
		},
		filterOptions: {
			customers: uniqueCustomers,
			items: uniqueItems,
			countries: uniqueCountries,
			priceRange
		}
	};
};
