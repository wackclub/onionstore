import { json, error } from '@sveltejs/kit';
import { db, payouts } from '$lib/server/db';
import { eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	try {
		// Delete all payouts that don't have an airtableSubmissionId (manual payouts like TEST)
		const deleted = await db
			.delete(payouts)
			.where(isNull(payouts.airtableSubmissionId))
			.returning();

		return json({
			success: true,
			message: `Deleted ${deleted.length} test payout(s)`,
			deletedPayouts: deleted
		});
	} catch (err) {
		console.error('Clear test payouts error:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to clear test payouts');
	}
};
