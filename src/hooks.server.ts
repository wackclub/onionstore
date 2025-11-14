import { sequence } from '@sveltejs/kit/hooks';
import { db, usersWithTokens } from '$lib/server/db';
import { redirect, type Handle } from '@sveltejs/kit';
import { SESSIONS_SECRET } from '$env/static/private';
import { symmetric } from '$lib/server/crypto';
import { eq } from 'drizzle-orm';

const authMiddleware: Handle = async ({ event, resolve }) => {
	// Skip authentication for auth-related endpoints
	if (event.url.toString().includes('/api/login')) return resolve(event);
	if (event.url.toString().includes('/api/verify')) return resolve(event);
	if (event.url.toString().includes('/api/uploadthing')) return resolve(event);

	const start = performance.now();
	const sessionCookie = event.cookies.get('_boba_mahad_says_hi_session');
	if (!sessionCookie) return resolve(event);

	let email;
	try {
		email = await symmetric.decrypt(sessionCookie, SESSIONS_SECRET);
		if (!email) throw new Error();
	} catch {
		event.cookies.delete('_boba_mahad_says_hi_session', {
			path: '/'
		});
	}

	if (email) {
		const [user] = await db
			.select()
			.from(usersWithTokens)
			.where(eq(usersWithTokens.email, email))
			.limit(1);
		if (!user) {
			throw new Error(`Failed to get user ${email}, even when they have a valid session`);
		}
		event.locals.user = user;
	}

	console.log(`authMiddleware took ${performance.now() - start}ms`);
	return resolve(event);
};

const redirectMiddleware: Handle = async ({ event, resolve }) => {
	if (event.url.toString().includes('/api/uploadthing')) return resolve(event);
	if (event.url.toString().includes('/api/login')) return resolve(event);
	if (event.url.toString().includes('/api/verify')) return resolve(event);

	// Redirect to login page if not authenticated
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	// Prevent non-admin access to admin routes
	if (event.locals.user && !event.locals.user.isAdmin && event.url.pathname.includes('admin')) {
		return redirect(302, '/');
	}

	return resolve(event);
};

export const handle = sequence(authMiddleware, redirectMiddleware);
