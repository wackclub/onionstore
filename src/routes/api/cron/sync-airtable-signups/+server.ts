import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { rawUsers, shopOrders } from '$lib/server/db/schema';
import { eq, isNull, isNotNull, and } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { lookupAirtableSignupByEmail, updateShopOrderInAirtable } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');
	if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const results = {
		usersProcessed: 0,
		usersUpdated: 0,
		ordersUpdated: 0,
		errors: [] as string[]
	};

	try {
		const usersWithoutSignups = await db
			.select({
				id: rawUsers.id,
				email: rawUsers.email
			})
			.from(rawUsers)
			.where(isNull(rawUsers.airtableSignupsRecordId));

		results.usersProcessed = usersWithoutSignups.length;

		for (const user of usersWithoutSignups) {
			try {
				const signupsId = await lookupAirtableSignupByEmail(user.email);

				if (signupsId) {
					await db
						.update(rawUsers)
						.set({ airtableSignupsRecordId: signupsId })
						.where(eq(rawUsers.id, user.id));

					results.usersUpdated++;

					const ordersToUpdate = await db
						.select({
							id: shopOrders.id,
							airtableRecordId: shopOrders.airtableRecordId
						})
						.from(shopOrders)
						.where(and(eq(shopOrders.userId, user.id), isNotNull(shopOrders.airtableRecordId)));

					for (const order of ordersToUpdate) {
						if (order.airtableRecordId) {
							try {
								await updateShopOrderInAirtable(order.airtableRecordId, {
									userId: signupsId
								});
								results.ordersUpdated++;
							} catch (orderError) {
								const errorMsg = `Failed to update order ${order.id}: ${orderError}`;
								console.error(errorMsg);
								results.errors.push(errorMsg);
							}
						}
					}
				}
			} catch (userError) {
				const errorMsg = `Failed to process user ${user.id}: ${userError}`;
				console.error(errorMsg);
				results.errors.push(errorMsg);
			}
		}

		console.log('Airtable signups sync completed:', results);

		return json({
			success: true,
			...results
		});
	} catch (error) {
		console.error('Cron job failed:', error);
		return json(
			{
				success: false,
				error: 'Internal server error',
				...results
			},
			{ status: 500 }
		);
	}
};
