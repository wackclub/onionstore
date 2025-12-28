import { json, error } from '@sveltejs/kit';
import { db, usersWithTokens } from '$lib/server/db';
import { or, ilike } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { escapeLikePattern } from '$lib/server/validation';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	const query = url.searchParams.get('q')?.trim();

	if (!query) {
		return json({ users: [] });
	}

	const escapedQuery = escapeLikePattern(query);

	const users = await db
		.select()
		.from(usersWithTokens)
		.where(
			or(
				ilike(usersWithTokens.email, `%${escapedQuery}%`),
				ilike(usersWithTokens.displayName, `%${escapedQuery}%`)
			)
		)
		.limit(10);

	return json({
		users: users.map((u) => ({
			email: u.email,
			displayName: u.displayName,
			tokens: u.tokens,
			isAdmin: u.isAdmin
		}))
	});
};
