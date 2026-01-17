import { redirect, fail } from '@sveltejs/kit';
import { db, rawUsers, payouts, usersWithTokens } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}

	return {};
};

export const actions = {
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

			const previousBalance = await db
				.select()
				.from(usersWithTokens)
				.where(eq(usersWithTokens.id, user[0].id))
				.limit(1);

			const previousTokens = previousBalance[0]?.tokens ?? 0;

			await db.insert(payouts).values({
				userId: user[0].id,
				tokens: tokens,
				memo: reason
			});

			return {
				givePointsSuccess: true,
				message: `Added ${tokens} tokens to ${email}. Reason: ${reason}`,
				user: {
					email,
					previousTotal: previousTokens,
					pointsChanged: tokens,
					newTotal: previousTokens + tokens
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
