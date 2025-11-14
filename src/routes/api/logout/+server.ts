import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ cookies }: RequestEvent) {
	// Delete the session cookie
	cookies.delete('_boba_mahad_says_hi_session', {
		path: '/'
	});

	// Redirect to login page
	throw redirect(302, '/login');
}
