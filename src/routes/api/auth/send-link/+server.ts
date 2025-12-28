import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { loginTokens } from '$lib/server/db/schema';
import { sendLoginEmail } from '$lib/server/email';
import { nanoid } from 'nanoid';
import { sendLinkSchema } from '$lib/server/validation';
import { checkRateLimit } from '$lib/server/rate-limit';
import { ArkErrors } from 'arktype';

export const POST: RequestHandler = async ({ request, url }) => {
	const body = await request.json();
	const parsed = sendLinkSchema(body);

	if (parsed instanceof ArkErrors) {
		return json({ error: 'Invalid email format' }, { status: 400 });
	}

	const email = parsed.email.toLowerCase();

	const rateLimit = await checkRateLimit(`login:${email}`, 5, 900);
	if (!rateLimit.success) {
		return json(
			{ error: 'Too many login attempts. Please try again later.' },
			{
				status: 429,
				headers: { 'Retry-After': String(rateLimit.reset) }
			}
		);
	}

	const token = nanoid(32);
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

	try {
		await db.insert(loginTokens).values({
			email,
			token,
			expiresAt
		});
		const loginUrl = `${url.origin}/api/auth/verify?token=${token}`;
		await sendLoginEmail(email, loginUrl);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to send login email:', error);
		return json({ error: 'Failed to send login email' }, { status: 500 });
	}
};
