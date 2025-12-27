import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { loginTokens, rawUsers } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { symmetric } from '$lib/server/crypto';
import { SESSIONS_SECRET } from '$env/static/private';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw redirect(302, '/login?error=invalid_token');
	}

	const loginToken = await db
		.select()
		.from(loginTokens)
		.where(and(eq(loginTokens.token, token), gt(loginTokens.expiresAt, new Date())))
		.limit(1);

	if (!loginToken || loginToken.length === 0) {
		throw redirect(302, '/login?error=expired_token');
	}

	const { email } = loginToken[0];

	let user = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

	if (!user || user.length === 0) {
		const newUser = await db
			.insert(rawUsers)
			.values({
				email,
				displayName: email.split('@')[0]
			})
			.returning();
		user = newUser;
	}

	await db.delete(loginTokens).where(eq(loginTokens.token, token));

	cookies.set('_boba_mahad_says_hi_session', await symmetric.encrypt(user[0].id, SESSIONS_SECRET), {
		path: '/',
		maxAge: 60 * 60 * 24 * 90,
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production'
	});

	if (!user[0].country) {
		throw redirect(302, '/welcome');
	}

	throw redirect(302, '/');
};
