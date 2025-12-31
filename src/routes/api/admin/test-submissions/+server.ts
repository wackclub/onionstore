import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AIRTABLE_BASE_ID, AIRTABLE_SUBMISSIONS_TABLE } from '$lib/server/airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	try {
		console.log('Testing submissions sync...');
		console.log('AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? 'SET' : 'NOT SET');
		console.log('AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID);
		console.log('AIRTABLE_SUBMISSIONS_TABLE:', AIRTABLE_SUBMISSIONS_TABLE);

		if (!AIRTABLE_API_KEY) {
			throw new Error('AIRTABLE_API_KEY not configured');
		}

		const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_SUBMISSIONS_TABLE)}`;
		console.log('URL:', url);

		const params = new URLSearchParams();
		params.set('filterByFormula', '{Review} = "Approved"');
		params.set('maxRecords', '3');

		const fullUrl = `${url}?${params}`;
		console.log('Full URL:', fullUrl);

		const response = await fetch(fullUrl, {
			headers: {
				Authorization: `Bearer ${AIRTABLE_API_KEY}`,
				'Content-Type': 'application/json'
			}
		});

		console.log('Response status:', response.status);
		console.log('Response statusText:', response.statusText);

		const data = await response.json();

		if (!response.ok) {
			console.error('Airtable error response:', data);
			return json({
				success: false,
				error: 'Airtable request failed',
				status: response.status,
				statusText: response.statusText,
				data
			}, { status: 500 });
		}

		console.log('Success! Found records:', data.records?.length || 0);

		return json({
			success: true,
			message: `Found ${data.records?.length || 0} approved submissions`,
			records: data.records,
			config: {
				baseId: AIRTABLE_BASE_ID,
				tableId: AIRTABLE_SUBMISSIONS_TABLE,
				hasApiKey: !!AIRTABLE_API_KEY
			}
		});
	} catch (err) {
		console.error('Test error:', err);
		return json({
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error',
			stack: err instanceof Error ? err.stack : undefined
		}, { status: 500 });
	}
};
