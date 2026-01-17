import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { rawUsers, payouts } from '$lib/server/db/schema';
import { eq, isNotNull, and, ne, sql } from 'drizzle-orm';
import { fetchApprovedSubmissions } from '$lib/server/airtable';

interface SyncResult {
	created: number;
	updated: number;
	removed: number;
	skipped: number;
	errors: string[];
	details: {
		created: string[];
		updated: string[];
		removed: string[];
		skipped: string[];
	};
}

export async function syncSubmissions() {
	const result: SyncResult = {
		created: 0,
		updated: 0,
		removed: 0,
		skipped: 0,
		errors: [],
		details: {
			created: [],
			updated: [],
			removed: [],
			skipped: []
		}
	};

	try {
		const submissions = await fetchApprovedSubmissions();

		for (const submission of submissions) {
			try {
				const existingPayout = await db
					.select()
					.from(payouts)
					.where(eq(payouts.submissionAirtableRecordId, submission.recordId))
					.limit(1);

				if (existingPayout.length > 0) {
					const payout = existingPayout[0];

					if (payout.tokens !== submission.tokens) {
						await db
							.update(payouts)
							.set({
								tokens: submission.tokens,
								memo: `${submission.name} - ${submission.challenge}`
							})
							.where(eq(payouts.id, payout.id));

						result.updated++;
						result.details.updated.push(
							`${submission.email}: ${payout.tokens} -> ${submission.tokens} tokens`
						);
					} else {
						result.skipped++;
						result.details.skipped.push(`${submission.email}: already synced`);
					}
					continue;
				}

				const user = await db
					.select()
					.from(rawUsers)
					.where(sql`LOWER(${rawUsers.email}) = ${submission.email}`)
					.limit(1);

				if (user.length === 0) {
					result.skipped++;
					result.details.skipped.push(`${submission.email}: user not found`);
					continue;
				}

				await db.insert(payouts).values({
					userId: user[0].id,
					tokens: submission.tokens,
					memo: `${submission.name} - ${submission.challenge}`,
					submissionAirtableRecordId: submission.recordId
				});

				result.created++;
				result.details.created.push(`${submission.email}: +${submission.tokens} tokens`);
			} catch (submissionError) {
				const errorMsg = `Failed to process submission ${submission.recordId}: ${submissionError}`;
				console.error(errorMsg);
				result.errors.push(errorMsg);
			}
		}

		const approvedRecordIds = new Set(submissions.map((s) => s.recordId));

		const linkedPayouts = await db
			.select({
				id: payouts.id,
				tokens: payouts.tokens,
				memo: payouts.memo,
				submissionAirtableRecordId: payouts.submissionAirtableRecordId
			})
			.from(payouts)
			.where(and(isNotNull(payouts.submissionAirtableRecordId), ne(payouts.tokens, 0)));

		for (const payout of linkedPayouts) {
			if (!approvedRecordIds.has(payout.submissionAirtableRecordId!)) {
				try {
					await db
						.update(payouts)
						.set({
							tokens: 0,
							memo: `[REMOVED] ${payout.memo || 'Submission no longer approved'}`
						})
						.where(eq(payouts.id, payout.id));

					result.removed++;
					result.details.removed.push(
						`${payout.submissionAirtableRecordId}: ${payout.tokens} -> 0 tokens`
					);
				} catch (removeError) {
					const errorMsg = `Failed to zero out payout ${payout.id}: ${removeError}`;
					console.error(errorMsg);
					result.errors.push(errorMsg);
				}
			}
		}

		const message =
			result.created > 0 || result.updated > 0 || result.removed > 0
				? `Synced ${result.created} new, updated ${result.updated}, removed ${result.removed}, skipped ${result.skipped}`
				: `No new submissions to sync (${result.skipped} already synced)`;

		return json({
			success: true,
			message,
			...result
		});
	} catch (error) {
		console.error('Submissions sync failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
				...result
			},
			{ status: 500 }
		);
	}
}
