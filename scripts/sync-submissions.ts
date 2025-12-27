import { db } from '../src/lib/server/db';
import { payouts, rawUsers } from '../src/lib/server/db/schema';
import { eq, isNotNull } from 'drizzle-orm';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appNasWZkM6JW1nj3'; // Onion Wars base
const AIRTABLE_SUBMISSIONS_TABLE = 'tbl1qlhGJPoHRWgM3'; // Submissions table

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
		throw new Error('AIRTABLE_API_KEY environment variable is required');
	}

	console.log('Fetching approved submissions from Airtable...');

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
			throw new Error(
				`Failed to fetch Airtable records: ${response.status} ${response.statusText}`
			);
		}

		const data: AirtableResponse = await response.json();
		allRecords = allRecords.concat(data.records);
		offset = data.offset;

		console.log(`Fetched ${allRecords.length} approved submissions so far...`);
	} while (offset);

	console.log(`Total approved submissions: ${allRecords.length}`);
	return allRecords;
}

function parsePoints(pointsField: string | undefined): number {
	if (!pointsField) return 0;
	const parsed = parseInt(pointsField, 10);
	return isNaN(parsed) ? 0 : parsed;
}

async function syncSubmissionsToPayouts(): Promise<void> {
	const submissions = await fetchApprovedSubmissions();

	// Get all existing payouts with airtableSubmissionId
	const existingPayouts = await db
		.select()
		.from(payouts)
		.where(isNotNull(payouts.airtableSubmissionId));

	const existingPayoutMap = new Map(existingPayouts.map((p) => [p.airtableSubmissionId, p]));

	// Track which submission IDs we see from Airtable
	const seenSubmissionIds = new Set<string>();

	let created = 0;
	let updated = 0;
	let skipped = 0;
	let deleted = 0;

	for (const submission of submissions) {
		const email = submission.fields.filloutemail?.toLowerCase().trim();
		seenSubmissionIds.add(submission.id);

		if (!email) {
			console.log(`Skipping submission ${submission.id}: no email`);
			skipped++;
			continue;
		}

		// Find user by email
		const user = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

		if (user.length === 0) {
			console.log(`Skipping submission ${submission.id}: user not found for ${email}`);
			skipped++;
			continue;
		}

		const tokens = parsePoints(submission.fields.Points);
		const challengeName = submission.fields['Challenge (from Challenge)']?.[0] ?? 'Submission';
		const projectName = submission.fields.Name ?? 'Unknown';
		const memo = `${challengeName}: ${projectName}`;

		const existingPayout = existingPayoutMap.get(submission.id);

		if (existingPayout) {
			// Update if tokens or memo changed
			if (existingPayout.tokens !== tokens || existingPayout.memo !== memo) {
				await db
					.update(payouts)
					.set({ tokens, memo, userId: user[0].id })
					.where(eq(payouts.airtableSubmissionId, submission.id));
				console.log(`Updated payout for submission ${submission.id}: ${tokens} tokens`);
				updated++;
			}
		} else {
			// Create new payout
			await db.insert(payouts).values({
				tokens,
				userId: user[0].id,
				memo,
				airtableSubmissionId: submission.id
			});
			console.log(`Created payout for submission ${submission.id}: ${tokens} tokens for ${email}`);
			created++;
		}
	}

	// Delete payouts for submissions that no longer exist or are no longer approved
	for (const [submissionId, payout] of existingPayoutMap) {
		if (!seenSubmissionIds.has(submissionId!)) {
			await db.delete(payouts).where(eq(payouts.id, payout.id));
			console.log(`Deleted payout ${payout.id} for removed/unapproved submission ${submissionId}`);
			deleted++;
		}
	}

	console.log('\n=== Submissions Sync Complete ===');
	console.log(`Created: ${created}`);
	console.log(`Updated: ${updated}`);
	console.log(`Deleted: ${deleted}`);
	console.log(`Skipped: ${skipped}`);
}

async function main() {
	try {
		console.log('=== Airtable Submissions -> Payouts Sync ===\n');
		await syncSubmissionsToPayouts();
	} catch (error) {
		console.error('Sync failed:', error);
		process.exit(1);
	}
}

main();
