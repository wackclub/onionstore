import { redirect, fail } from '@sveltejs/kit';
import { db, rawUsers, payouts } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE } from '$lib/server/airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

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
			const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_USERS_TABLE}`;
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

		const tokens = parseInt(pointsStr);
		if (isNaN(tokens) || tokens === 0) {
			return fail(400, { givePointsError: 'Tokens must be a valid non-zero number' });
		}

		if (tokens < 0) {
			return fail(400, {
				givePointsError: 'Cannot remove tokens. Use positive numbers to add tokens.'
			});
		}

		try {
			const user = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

			if (user.length === 0) {
				return fail(404, { givePointsError: `User not found: ${email}` });
			}

			await db.insert(payouts).values({
				userId: user[0].id,
				tokens: tokens,
				memo: reason
			});

			const newTotal = user[0].totalEarnedPoints + tokens;
			await db
				.update(rawUsers)
				.set({ totalEarnedPoints: newTotal })
				.where(eq(rawUsers.email, email));

			if (AIRTABLE_API_KEY && user[0].airtableRecordId) {
				try {
					const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_USERS_TABLE}/${user[0].airtableRecordId}`;
					await fetch(airtableUrl, {
						method: 'PATCH',
						headers: {
							Authorization: `Bearer ${AIRTABLE_API_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							fields: {
								'Total Earned Points': newTotal,
								Tokens: newTotal
							}
						})
					});
				} catch (airtableError) {
					console.error('Failed to sync to Airtable:', airtableError);
				}
			}

			return {
				givePointsSuccess: true,
				message: `Added ${tokens} tokens to ${email}. Reason: ${reason}`,
				user: {
					email,
					previousTotal: user[0].totalEarnedPoints,
					pointsChanged: tokens,
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
