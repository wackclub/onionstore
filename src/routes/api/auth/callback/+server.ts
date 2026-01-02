import { redirect, error } from '@sveltejs/kit';
import { db, rawUsers } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { symmetric } from '$lib/server/crypto';
import { SESSIONS_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';

const HACKCLUB_CLIENT_ID = process.env.HACKCLUB_CLIENT_ID;
const HACKCLUB_CLIENT_SECRET = process.env.HACKCLUB_CLIENT_SECRET;
const HACKCLUB_REDIRECT_URI = process.env.HACKCLUB_REDIRECT_URI || 'http://localhost:5173/api/auth/callback';

interface HackClubTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}

interface HackClubUser {
	id: string;
	email: string;
	name?: string;
	slack_id?: string;
	verification_status?: string;
	created_at: string;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const error_param = url.searchParams.get('error');

	if (error_param) {
		console.error('OAuth error:', error_param);
		throw error(400, 'Authentication failed');
	}

	if (!code) {
		throw error(400, 'No authorization code provided');
	}

	if (!HACKCLUB_CLIENT_ID || !HACKCLUB_CLIENT_SECRET) {
		throw error(500, 'OAuth not configured');
	}

	try {
		// Exchange code for access token
		const tokenResponse = await fetch('https://auth.hackclub.com/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: HACKCLUB_CLIENT_ID,
				client_secret: HACKCLUB_CLIENT_SECRET,
				redirect_uri: HACKCLUB_REDIRECT_URI,
				code,
				grant_type: 'authorization_code'
			})
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('Token exchange failed:', errorText);
			throw error(500, 'Failed to exchange authorization code');
		}

		const tokens: HackClubTokenResponse = await tokenResponse.json();

		// Get user info from Hack Club API
		const userResponse = await fetch('https://auth.hackclub.com/api/v1/me', {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`
			}
		});

		if (!userResponse.ok) {
			const errorText = await userResponse.text();
			console.error('Failed to get user info:', errorText);
			throw error(500, 'Failed to get user information');
		}

		const hackClubUser: HackClubUser = await userResponse.json();

		if (!hackClubUser.email) {
			throw error(400, 'No email address returned from Hack Club');
		}

		// Create or update user in database
		const email = hackClubUser.email.toLowerCase().trim();
		const existingUsers = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

		let userId: string;

		if (existingUsers.length > 0) {
			// Update existing user
			const user = existingUsers[0];
			await db
				.update(rawUsers)
				.set({
					displayName: hackClubUser.name || user.displayName,
					slackId: hackClubUser.slack_id || user.slackId
				})
				.where(eq(rawUsers.email, email));
			userId = user.id;
		} else {
			// Create new user
			const [newUser] = await db
				.insert(rawUsers)
				.values({
					email,
					displayName: hackClubUser.name || hackClubUser.email,
					slackId: hackClubUser.slack_id,
					isAdmin: false
				})
				.returning();
			userId = newUser.id;
		}

		// Create session
		const sessionToken = await symmetric.encrypt(userId, SESSIONS_SECRET);

		cookies.set('_boba_mahad_says_hi_session', sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		// Redirect to welcome page or home
		throw redirect(302, '/welcome');
	} catch (err) {
		console.error('OAuth callback error:', err);
		if (err instanceof Response) throw err;
		throw error(500, err instanceof Error ? err.message : 'Authentication failed');
	}
};
