import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { rawUsers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { updateUserSchema } from '$lib/server/validation';
import { ArkErrors } from 'arktype';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const parsed = updateUserSchema(body);

	if (parsed instanceof ArkErrors) {
		return json({ error: 'Invalid user details' }, { status: 400 });
	}

	try {
		await db
			.update(rawUsers)
			.set({ country: parsed.country.toUpperCase(), displayName: parsed.name })
			.where(eq(rawUsers.id, locals.user.id));

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update country:', error);
		return json({ error: 'Failed to update country' }, { status: 500 });
	}
};
