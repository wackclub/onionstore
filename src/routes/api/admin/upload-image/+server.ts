import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_CDN_API_DOMAIN = 'cdnapi.mahadk.com';
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
	if (!locals.user?.isAdmin) {
		throw error(403, 'Unauthorized');
	}

	const token = env.CDN_API_TOKEN ?? env.CDN_TOKEN;
	if (!token) {
		throw error(500, 'CDN API token is not configured');
	}

	const domain = env.CDN_API_DOMAIN || DEFAULT_CDN_API_DOMAIN;
	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		throw error(400, 'Missing file');
	}

	if (!file.type.startsWith('image/')) {
		throw error(400, 'Only image files are allowed');
	}

	if (file.size > MAX_FILE_SIZE_BYTES) {
		throw error(400, 'File size must be under 4MB');
	}

	const upstreamFormData = new FormData();
	upstreamFormData.append('file', file);

	const response = await fetch(`https://${domain}/api/file`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`
		},
		body: upstreamFormData
	});

	if (!response.ok) {
		const body = await response.text();
		throw error(502, body || `Upload failed: ${response.status}`);
	}

	const data = (await response.json()) as { url?: string };
	if (!data.url) {
		throw error(502, 'CDN response did not include a URL');
	}

	return json({ url: data.url });
};
