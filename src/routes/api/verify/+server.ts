import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db, loginTokens, rawUsers } from '$lib/server/db';
import { symmetric } from '$lib/server/crypto';
import { SESSIONS_SECRET } from '$env/static/private';
import { eq, and, gt } from 'drizzle-orm';

export async function GET({ url, cookies }: RequestEvent) {
	const token = url.searchParams.get('token');

	if (!token) {
		// Redirect to login page with error
		throw redirect(302, '/?error=invalid_token');
	}

	// Find the login token
	const [loginToken] = await db
		.select()
		.from(loginTokens)
		.where(and(eq(loginTokens.token, token), gt(loginTokens.expiresAt, new Date())))
		.limit(1);

	if (!loginToken) {
		// Token not found or expired
		throw redirect(302, '/?error=token_expired');
	}

	// Create or update user
	await db
		.insert(rawUsers)
		.values({
			email: loginToken.email,
			displayName: loginToken.email.split('@')[0], // Use email prefix as default display name
			avatarUrl: null,
			isAdmin: false
		})
		.onConflictDoUpdate({
			target: rawUsers.email,
			set: {
				// We don't update anything on subsequent logins, just ensure user exists
				email: loginToken.email
			}
		});

	// Delete the used token
	await db.delete(loginTokens).where(eq(loginTokens.token, token));

	// Set session cookie with encrypted email
	cookies.set('_boba_mahad_says_hi_session', await symmetric.encrypt(loginToken.email, SESSIONS_SECRET), {
		path: '/',
		maxAge: 60 * 60 * 24 * 90 // 90 days in seconds
	});

	// Redirect to home
	throw redirect(302, '/');
}
