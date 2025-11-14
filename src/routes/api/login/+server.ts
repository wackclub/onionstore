import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db, loginTokens } from '$lib/server/db';
import { sendLoginEmail } from '$lib/server/loops';
import { nanoid } from 'nanoid';

const INVALID_EMAIL = 'Invalid email address';
const EMAIL_SEND_FAILED = 'Failed to send login email';

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const { email } = await request.json();

		if (!email || !isValidEmail(email)) {
			return json({ error: INVALID_EMAIL }, { status: 400 });
		}

		// Normalize email to lowercase
		const normalizedEmail = email.toLowerCase().trim();

		// Generate a unique login token
		const token = nanoid(32);

		// Token expires in 15 minutes
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

		// Store the login token in the database
		await db.insert(loginTokens).values({
			token,
			email: normalizedEmail,
			expiresAt
		});

		// Create the login URL
		const loginUrl = `${url.origin}/api/verify?token=${token}`;

		// Send the login email
		const emailSent = await sendLoginEmail({
			email: normalizedEmail,
			loginUrl
		});

		if (!emailSent) {
			return json({ error: EMAIL_SEND_FAILED }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'An error occurred' }, { status: 500 });
	}
}
