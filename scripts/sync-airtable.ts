import { db } from '../src/lib/server/db';
import { rawUsers } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appNasWZkM6JW1nj3'; // Onion Wars base
const AIRTABLE_USERS_TABLE = 'tblpJEJAfy5rEc5vG'; // Signups table

interface AirtableRecord {
	id: string;
	fields: {
		filloutemail?: string;
		Name?: string;
		slackId?: string;
		avatarUrl?: string;
		idAdmin?: boolean;
		'Total Earned Points'?: number;
		'Points Redeemed'?: number;
		Tokens?: number;
		'Address Line 1'?: string;
		'Address Line 2'?: string;
		City?: string;
		State?: string;
		ZIP?: string;
		Country?: string;
		[key: string]: unknown;
	};
}

interface AirtableResponse {
	records: AirtableRecord[];
	offset?: string;
}

async function fetchAllAirtableRecords(): Promise<AirtableRecord[]> {
	if (!AIRTABLE_API_KEY) {
		throw new Error('AIRTABLE_API_KEY environment variable is required');
	}

	console.log('Fetching records from Airtable...');

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
	const headers = {
		Authorization: `Bearer ${AIRTABLE_API_KEY}`,
		'Content-Type': 'application/json'
	};

	let allRecords: AirtableRecord[] = [];
	let offset: string | undefined;

	do {
		const params = new URLSearchParams();
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

		console.log(`Fetched ${allRecords.length} records so far...`);
	} while (offset);

	console.log(`Total records fetched: ${allRecords.length}`);
	return allRecords;
}

async function syncUsersFromAirtable(): Promise<void> {
	const records = await fetchAllAirtableRecords();

	let created = 0;
	let updated = 0;
	let skipped = 0;

	for (const record of records) {
		const email = record.fields.filloutemail?.toLowerCase().trim();

		if (!email) {
			skipped++;
			continue;
		}

		const existingUser = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

		const userData = {
			airtableRecordId: record.id,
			displayName: record.fields.Name ?? null,
			slackId: record.fields.slackId ?? null,
			isAdmin: record.fields.idAdmin ?? false,
			totalEarnedPoints: record.fields['Total Earned Points'] ?? 0,
			pointsRedeemed: record.fields['Points Redeemed'] ?? 0,
			addressLine1: record.fields['Address Line 1'] ?? null,
			addressLine2: record.fields['Address Line 2'] ?? null,
			city: record.fields.City ?? null,
			state: record.fields.State ?? null,
			zipPostal: record.fields.ZIP ?? null,
			shippingCountry: record.fields.Country ?? null
		};

		if (existingUser.length > 0) {
			await db.update(rawUsers).set(userData).where(eq(rawUsers.email, email));
			updated++;
		} else {
			await db.insert(rawUsers).values({
				email,
				...userData
			});
			created++;
		}
	}

	console.log('\n=== Sync Complete ===');
	console.log(`Created: ${created}`);
	console.log(`Updated: ${updated}`);
	console.log(`Skipped (no email): ${skipped}`);
}

async function main() {
	try {
		console.log('=== Airtable -> Postgres Sync ===\n');
		await syncUsersFromAirtable();
	} catch (error) {
		console.error('Sync failed:', error);
		process.exit(1);
	}
}

main();
