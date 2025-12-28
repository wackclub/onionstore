import { db, rawUsers, payouts, usersWithTokens } from '../src/lib/server/db';
import { eq, sum } from 'drizzle-orm';
import { AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE } from './airtable-config';

const email = process.env.EMAIL || process.argv[2];

if (!email) {
	console.error('Error: Email is required.');
	console.error('Usage: EMAIL=user@example.com bun run scripts/fix-my-tokens.ts');
	console.error('   or: bun run scripts/fix-my-tokens.ts user@example.com');
	process.exit(1);
}

if (!email.includes('@')) {
	console.error('Error: Invalid email format.');
	process.exit(1);
}

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

async function fixTokens() {
	try {
		const user = await db.select().from(rawUsers).where(eq(rawUsers.email, email)).limit(1);

		if (user.length === 0) {
			console.log('❌ User not found');
			return;
		}

		const userWithTokens = await db
			.select()
			.from(usersWithTokens)
			.where(eq(usersWithTokens.email, email))
			.limit(1);

		const payoutSum = await db
			.select({ total: sum(payouts.tokens) })
			.from(payouts)
			.where(eq(payouts.userId, user[0].id));

		const totalFromPayouts = Number(payoutSum[0]?.total ?? 0);
		const tokensInUI = userWithTokens[0]?.tokens ?? 0;

		console.log('\n=== Current State ===');
		console.log(`Email: ${email}`);
		console.log(`Tokens in UI (usersWithTokens view): ${tokensInUI}`);
		console.log(`Total from payouts table: ${totalFromPayouts}`);
		console.log(`totalEarnedPoints in DB: ${user[0].totalEarnedPoints}`);
		console.log(`Airtable Record ID: ${user[0].airtableRecordId ?? 'Not set'}`);

		const correctTotal = totalFromPayouts;

		console.log(`\n=== Fixing ===`);
		console.log(`Setting totalEarnedPoints to ${correctTotal} (matching payouts)`);

		await db
			.update(rawUsers)
			.set({ totalEarnedPoints: correctTotal })
			.where(eq(rawUsers.email, email));

		if (AIRTABLE_API_KEY && user[0].airtableRecordId) {
			console.log(`Syncing to Airtable...`);
			const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_USERS_TABLE}/${user[0].airtableRecordId}`;
			const response = await fetch(airtableUrl, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${AIRTABLE_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					fields: {
						'Total Earned Points': correctTotal,
						Tokens: correctTotal
					}
				})
			});

			if (response.ok) {
				console.log(`✓ Synced to Airtable`);
			} else {
				const error = await response.text();
				console.log(`✗ Failed to sync to Airtable: ${error}`);
			}
		} else {
			console.log(`⚠ Skipping Airtable sync (no API key or record ID)`);
		}

		console.log(`\n✓ Done! Refresh the page to see updated tokens.`);
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

fixTokens();
