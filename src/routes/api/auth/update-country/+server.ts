import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { country } = await request.json();

	if (!country || typeof country !== 'string' || country.length !== 2) {
		return json({ error: 'Invalid country code' }, { status: 400 });
	}

	try {
		await db
			.update(rawUsers)
			.set({ country: country.toUpperCase() })
			.where(eq(rawUsers.id, locals.user.id));

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update country:', error);
		return json({ error: 'Failed to update country' }, { status: 500 });
	}
};
