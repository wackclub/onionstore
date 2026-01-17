import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncSubmissions } from '$lib/server/sync-submissions';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	return syncSubmissions();
};
