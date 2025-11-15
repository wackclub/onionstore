import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('_boba_mahad_says_hi_session', { path: '/' });
	throw redirect(302, '/login');
};
