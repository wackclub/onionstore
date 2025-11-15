import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { loginTokens } from '$lib/server/db/schema';
import { sendLoginEmail } from '$lib/server/email';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, url }) => {
	const { email } = await request.json();

	if (!email || typeof email !== 'string') {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return json({ error: 'Invalid email format' }, { status: 400 });
	}

	// Generate a secure token
	const token = nanoid(32);
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

	try {
		// Store the token in the database
		await db.insert(loginTokens).values({
			email: email.toLowerCase(),
			token,
			expiresAt
		});

		// Send the login email
		const loginUrl = `${url.origin}/api/auth/verify?token=${token}`;
		await sendLoginEmail(email.toLowerCase(), loginUrl);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to send login email:', error);
		return json({ error: 'Failed to send login email' }, { status: 500 });
	}
};
