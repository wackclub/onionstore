import { redirect, fail } from '@sveltejs/kit';
import { db, rawUsers } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appNasWZkM6JW1nj3';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}

	const hasAirtableKey = !!AIRTABLE_API_KEY;

	return {
		hasAirtableKey
	};
};

export const actions = {
	checkAirtableConnection: async ({ locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		if (!AIRTABLE_API_KEY) {
			return fail(400, {
				connectionStatus: 'error',
				error: 'AIRTABLE_API_KEY not configured in environment variables'
			});
		}

		try {
			const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/tblpJEJAfy5rEc5vG`;
			const response = await fetch(url + '?maxRecords=1', {
				headers: {
					Authorization: `Bearer ${AIRTABLE_API_KEY}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				return fail(400, {
					connectionStatus: 'error',
					error: `Airtable API returned ${response.status}: ${response.statusText}`
				});
			}

			const data = await response.json();

			return {
				connectionStatus: 'success',
				message: `Successfully connected to Airtable! Found ${data.records?.length ?? 0} record(s) in test query.`,
				baseId: AIRTABLE_BASE_ID
			};
		} catch (error) {
			return fail(500, {
				connectionStatus: 'error',
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			});
		}
	},

	givePoints: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { givePointsError: 'Unauthorized' });
		}

		const formData = await request.formData();
		const email = formData.get('email')?.toString().toLowerCase().trim();
		const pointsStr = formData.get('points')?.toString();
		const reason = formData.get('reason')?.toString() || 'Admin adjustment';

		if (!email || !pointsStr) {
			return fail(400, { givePointsError: 'Email and points are required' });
		}

		const points = parseInt(pointsStr);
		if (isNaN(points) || points === 0) {
			return fail(400, { givePointsError: 'Points must be a valid non-zero number' });
		}

		try {
			const user = await db
				.select()
				.from(rawUsers)
				.where(eq(rawUsers.email, email))
				.limit(1);

			if (user.length === 0) {
				return fail(404, { givePointsError: `User not found: ${email}` });
			}

			const currentTotal = user[0].totalEarnedPoints;
			const newTotal = currentTotal + points;

			if (newTotal < 0) {
				return fail(400, {
					givePointsError: `Cannot reduce points below 0. Current: ${currentTotal}, Requested change: ${points}`
				});
			}

			await db
				.update(rawUsers)
				.set({ totalEarnedPoints: newTotal })
				.where(eq(rawUsers.email, email));

			if (AIRTABLE_API_KEY && user[0].airtableRecordId) {
				try {
					const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/tblpJEJAfy5rEc5vG/${user[0].airtableRecordId}`;
					await fetch(airtableUrl, {
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${AIRTABLE_API_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							fields: {
								'Total Earned Points': newTotal
							}
						})
					});
				} catch (airtableError) {
					console.error('Failed to sync to Airtable:', airtableError);
				}
			}

			return {
				givePointsSuccess: true,
				message: `${points > 0 ? 'Added' : 'Removed'} ${Math.abs(points)} points ${points > 0 ? 'to' : 'from'} ${email}. New total: ${newTotal}`,
				user: {
					email,
					previousTotal: currentTotal,
					pointsChanged: points,
					newTotal
				}
			};
		} catch (error) {
			console.error('Give points error:', error);
			return fail(500, {
				givePointsError: error instanceof Error ? error.message : 'Failed to update points'
			});
		}
	}
} satisfies Actions;
