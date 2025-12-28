import { json, error } from '@sveltejs/kit';
import { db, usersWithTokens } from '$lib/server/db';
import { sql, or, ilike } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	const query = url.searchParams.get('q')?.trim();

	if (!query) {
		return json({ users: [] });
	}

	const users = await db
		.select()
		.from(usersWithTokens)
		.where(
			or(
				ilike(usersWithTokens.email, `%${query}%`),
				ilike(usersWithTokens.displayName, `%${query}%`)
			)
		)
		.limit(10);

	return json({
		users: users.map((u) => ({
			email: u.email,
			displayName: u.displayName,
			tokens: u.tokens,
			isAdmin: u.isAdmin,
			totalEarnedPoints: u.totalEarnedPoints
		}))
	});
};
