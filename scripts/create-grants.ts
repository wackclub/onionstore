import { readFileSync } from 'fs';
import path from 'path';
import { db } from '../src/lib/server/db';
import { shopItems, shopOrders } from '../src/lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

const HCBAPI_KEY = process.env.HCBAPI_KEY;
const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
const HCB_API_BASE_URL = 'https://hcbapi.skyfall.dev/api/v4/organizations/boba-drops/card_grants';

interface HCBGrantRequest {
	amount_cents: number;
	email: string;
	merchant_lock: string | null;
	category_lock: string | null;
	keyword_lock: string | null;
	purpose: string | null;
}

interface GrantAllocation {
	email: string;
	grantAmount: number;
	itemName: string;
	quantity: number;
	orderIds: string[];
	hcbMids: string[] | null;
}

interface GrantRequestFile {
	timestamp: string;
	total_grants: number;
	total_amount_dollars: number;
	grant_requests: HCBGrantRequest[];
	allocation_details: GrantAllocation[];
}

interface HCBGrantResponse {
	id: string;
	amount_cents: number;
	email: string;
	status: string;
	[key: string]: any;
}

async function createHCBGrant(grantRequest: HCBGrantRequest): Promise<HCBGrantResponse | null> {
	try {
		const response = await fetch(HCB_API_BASE_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${HCBAPI_KEY}`
			},
			body: JSON.stringify(grantRequest)
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`Failed to create grant for ${grantRequest.email}: ${response.status} ${response.statusText}`
			);
			console.error(`Error details: ${errorText}`);
			return null;
		}

		const result: HCBGrantResponse = await response.json();
		console.log(
			`✓ Created grant for ${grantRequest.email}: $${(grantRequest.amount_cents / 100).toFixed(2)} (ID: ${result.id})`
		);
		return result;
	} catch (error) {
		console.error(`Error creating grant for ${grantRequest.email}:`, error);
		return null;
	}
}

async function markOrdersApprovedAndSendEmails(allocation: GrantAllocation): Promise<void> {
	try {
		await db
			.update(shopOrders)
			.set({ status: 'approved' })
			.where(inArray(shopOrders.id, allocation.orderIds));

		console.log(
			`✓ Marked ${allocation.orderIds.length} orders as approved for ${allocation.email}`
		);

		if (LOOPS_API_KEY) {
			const response = await fetch('https://app.loops.so/api/v1/transactional', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${LOOPS_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					transactionalId: 'cmge904kq3fil070i2582g0yx', // approved email template ID
					email: allocation.email,
					dataVariables: {
						itemName: allocation.itemName,
						orderId: allocation.orderIds[0].slice(0, 8), // Use first order ID, truncated
						memo: `Grant created for ${allocation.quantity}x ${allocation.itemName}`
					}
				})
			});

			if (response.ok) {
				console.log(`✓ Sent fulfillment email to ${allocation.email}`);
			} else {
				console.error(
					`✗ Failed to send fulfillment email to ${allocation.email}: ${await response.text()}`
				);
			}
		} else {
			console.warn('LOOPS_API_KEY not set, skipping email notification');
		}
	} catch (error) {
		console.error(`Error marking orders approved for ${allocation.email}:`, error);
	}
}

async function processGrantFile(filename: string): Promise<void> {
	const filepath = path.join(process.cwd(), 'scripts', filename);

	try {
		const fileContent = readFileSync(filepath, 'utf8');
		const grantData: GrantRequestFile = JSON.parse(fileContent);

		console.log('=== HCB Grant Creator ===');
		console.log(`Processing file: ${filename}`);
		console.log(`Total grants to create: ${grantData.total_grants}`);
		console.log(`Total amount: $${grantData.total_amount_dollars.toFixed(2)}`);
		console.log(`Original timestamp: ${grantData.timestamp}\n`);

		const results: Array<{
			request: HCBGrantRequest;
			response: HCBGrantResponse | null;
			allocation: GrantAllocation;
		}> = [];
		const successful: HCBGrantResponse[] = [];
		const failed: HCBGrantRequest[] = [];
		const successfulAllocations: GrantAllocation[] = [];

		for (let i = 0; i < grantData.grant_requests.length; i++) {
			const grantRequest = grantData.grant_requests[i];
			const allocation = grantData.allocation_details[i]; // Allocation details should be in the same order
			console.log(`Processing grant ${i + 1}/${grantData.grant_requests.length}...`);

			const response = await createHCBGrant(grantRequest);
			results.push({ request: grantRequest, response, allocation });

			if (response) {
				successful.push(response);
				successfulAllocations.push(allocation);

				console.log(`Processing fulfillment for ${allocation.email}...`);
				await markOrdersApprovedAndSendEmails(allocation);
			} else {
				failed.push(grantRequest);
			}

			if (i < grantData.grant_requests.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
			}
		}

		console.log('\n=== SUMMARY ===');
		console.log(`Successful grants: ${successful.length}/${grantData.grant_requests.length}`);
		console.log(`Failed grants: ${failed.length}/${grantData.grant_requests.length}`);

		const totalOrdersApproved = successfulAllocations.reduce(
			(sum, allocation) => sum + allocation.orderIds.length,
			0
		);
		console.log(`Orders marked as approved: ${totalOrdersApproved}`);

		const successfulAmount = successful.reduce((sum, grant) => sum + grant.amount_cents / 100, 0);
		const failedAmount = failed.reduce((sum, req) => sum + req.amount_cents / 100, 0);

		console.log(`Total successful amount: $${successfulAmount.toFixed(2)}`);
		console.log(`Total failed amount: $${failedAmount.toFixed(2)}`);

		if (failed.length > 0) {
			console.log('\n=== FAILED GRANTS ===');
			for (const failedGrant of failed) {
				console.log(
					`- ${failedGrant.email}: $${(failedGrant.amount_cents / 100).toFixed(2)} for ${failedGrant.purpose || 'N/A'}`
				);
			}
		}

		const resultsFilename = filename.replace('.json', '-results.json');
		const resultsFilepath = path.join(process.cwd(), 'scripts', resultsFilename);

		const resultsData = {
			processed_at: new Date().toISOString(),
			source_file: filename,
			summary: {
				total_requests: grantData.grant_requests.length,
				successful: successful.length,
				failed: failed.length,
				successful_amount_dollars: successfulAmount,
				failed_amount_dollars: failedAmount,
				orders_approved: totalOrdersApproved
			},
			successful_grants: successful,
			failed_requests: failed,
			approved_allocations: successfulAllocations,
			all_results: results
		};

		require('fs').writeFileSync(resultsFilepath, JSON.stringify(resultsData, null, 2));
		console.log(`\nResults written to: ${resultsFilename}`);
	} catch (error) {
		if (error instanceof Error && error.message.includes('ENOENT')) {
			console.error(`Grant file not found: ${filename}`);
			console.error('Please make sure the file exists in the scripts directory.');
		} else {
			console.error('Error processing grant file:', error);
		}
		process.exit(1);
	}
}

async function main() {
	const filename = process.argv[2];

	if (!filename) {
		console.error('Usage: bun run scripts/create-grants.ts <grant-requests-file.json>');
		console.error(
			'Example: bun run scripts/create-grants.ts grant-requests-2025-08-29T10-30-00-000Z.json'
		);
		process.exit(1);
	}

	if (!HCBAPI_KEY) {
		console.error('HCBAPI_KEY environment variable is required');
		process.exit(1);
	}

	if (!LOOPS_API_KEY) {
		console.warn('LOOPS_API_KEY environment variable not set - emails will not be sent');
	}

	await processGrantFile(filename);
}

main().catch(console.error);
