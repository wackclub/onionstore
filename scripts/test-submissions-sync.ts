const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appNasWZkM6JW1nj3';
const AIRTABLE_SUBMISSIONS_TABLE = 'tbl1qlhGJPoHRWgM3';

async function testSync() {
	if (!AIRTABLE_API_KEY) {
		console.error('❌ AIRTABLE_API_KEY not set in environment');
		process.exit(1);
	}

	console.log('Testing Airtable Submissions sync...\n');
	console.log('Base ID:', AIRTABLE_BASE_ID);
	console.log('Table ID:', AIRTABLE_SUBMISSIONS_TABLE);
	console.log('Filter: {Review} = "Approved"\n');

	const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_SUBMISSIONS_TABLE)}`;
	const params = new URLSearchParams();
	params.set('filterByFormula', '{Review} = "Approved"');
	params.set('maxRecords', '5'); // Just get first 5 for testing

	try {
		const response = await fetch(`${url}?${params}`, {
			headers: {
				Authorization: `Bearer ${AIRTABLE_API_KEY}`,
				'Content-Type': 'application/json'
			}
		});

		console.log('Response status:', response.status);
		console.log('Response status text:', response.statusText);

		const data = await response.json();

		if (!response.ok) {
			console.error('\n❌ Error response:', JSON.stringify(data, null, 2));
			process.exit(1);
		}

		console.log('\n✅ Success! Found', data.records?.length || 0, 'approved submissions');

		if (data.records && data.records.length > 0) {
			console.log('\nFirst submission fields:');
			console.log(JSON.stringify(data.records[0].fields, null, 2));
		} else {
			console.log('\n⚠️  No approved submissions found. This might be why the sync appears to work but shows no data.');
		}
	} catch (error) {
		console.error('\n❌ Network error:', error);
		process.exit(1);
	}
}

testSync();
