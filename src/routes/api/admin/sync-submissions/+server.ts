import { json, error } from '@sveltejs/kit';
import { db, payouts, rawUsers } from '$lib/server/db';
import { eq, isNotNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { AIRTABLE_BASE_ID, AIRTABLE_SUBMISSIONS_TABLE } from '$lib/server/airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

interface AirtableSubmission {
	id: string;
	fields: {
		Name?: string;
		Review?: string;
		Rating?: string[];
		'Github URL'?: string;
		'Website URL'?: string;
		filloutemail?: string;
		Points?: string;
		Description?: string;
		'Challenge (from Challenge)'?: string[];
		[key: string]: unknown;
	};
}

interface AirtableResponse {
	records: AirtableSubmission[];
	offset?: string;
}

async function fetchApprovedSubmissions(): Promise<AirtableSubmission[]> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY not configured');
	}

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_SUBMISSIONS_TABLE)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: AirtableSubmission[] = [];
	let offset: string | undefined;

	do {
		const params = new URLSearchParams();
		params.set('filterByFormula', '{Review} = "Approved"');
		if (offset) params.set('offset', offset);

		const response = await fetch(`${url}?${params}`, { headers });
		if (!response.ok) {
			throw new Error(`Failed to fetch submissions: ${response.status} ${response.statusText}`);
		}

		const data: AirtableResponse = await response.json();
		allRecords = allRecords.concat(data.records);
		offset = data.offset;
	} while (offset);

	return allRecords;
}

function parsePoints(pointsField: string | undefined): number {
	if (!pointsField) return 0;
	const parsed = parseInt(pointsField, 10);
	return isNaN(parsed) ? 0 : parsed;
}

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	if (!AIRTABLE_API_KEY) {
		throw error(400, 'AIRTABLE_API_KEY not configured');
	}

	try {
		const submissions = await fetchApprovedSubmissions();

		const existingPayouts = await db
			.select()
			.from(payouts)
			.where(isNotNull(payouts.airtableSubmissionId));

		const existingPayoutMap = new Map(existingPayouts.map((p) => [p.airtableSubmissionId, p]));
		const seenSubmissionIds = new Set<string>();

		let created = 0;
		let updated = 0;
		let skipped = 0;
		let deleted = 0;

		for (const submission of submissions) {
			const email = submission.fields.filloutemail?.toLowerCase().trim();
			seenSubmissionIds.add(submission.id);

			if (!email) {
				skipped++;
				continue;
			}

			const user = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

			if (user.length === 0) {
				skipped++;
				continue;
			}

			const tokens = parsePoints(submission.fields.Points);
			const challengeName = submission.fields['Challenge (from Challenge)']?.[0] ?? 'Submission';
			const projectName = submission.fields.Name ?? 'Unknown';
			const memo = `${challengeName}: ${projectName}`;

			const existingPayout = existingPayoutMap.get(submission.id);

			if (existingPayout) {
				if (existingPayout.tokens !== tokens || existingPayout.memo !== memo) {
					await db
						.update(payouts)
						.set({ tokens, memo, userId: user[0].id })
						.where(eq(payouts.airtableSubmissionId, submission.id));
					updated++;
				}
			} else {
				await db.insert(payouts).values({
					tokens,
					userId: user[0].id,
					memo,
					airtableSubmissionId: submission.id
				});
				created++;
			}
		}

		for (const [submissionId, payout] of existingPayoutMap) {
			if (!seenSubmissionIds.has(submissionId!)) {
				await db.delete(payouts).where(eq(payouts.id, payout.id));
				deleted++;
			}
		}

		return json({
			success: true,
			message: `Submissions synced! Created: ${created}, Updated: ${updated}, Deleted: ${deleted}, Skipped: ${skipped}`,
			stats: {
				created,
				updated,
				deleted,
				skipped,
				total: submissions.length
			}
		});
	} catch (err) {
		console.error('Submissions sync error:', err);
		throw error(500, err instanceof Error ? err.message : 'Sync failed');
	}
};
