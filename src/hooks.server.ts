import { sequence } from '@sveltejs/kit/hooks';
import { db, usersWithTokens } from '$lib/server/db';
import { redirect, type Handle } from '@sveltejs/kit';
import { SESSIONS_SECRET } from '$env/static/private';
import { symmetric } from '$lib/server/crypto';
import { eq } from 'drizzle-orm';

const authMiddleware: Handle = async ({ event, resolve }) => {
	// Skip auth for public routes
	if (event.url.pathname.startsWith('/api/auth')) return resolve(event);
	if (event.url.pathname === '/login') return resolve(event);
	if (event.url.pathname.startsWith('/api/uploadthing')) return resolve(event);

	const start = performance.now();
	const sessionCookie = event.cookies.get('_boba_mahad_says_hi_session');
	if (!sessionCookie) return resolve(event);

	let userId;
	try {
		userId = await symmetric.decrypt(sessionCookie, SESSIONS_SECRET);
		if (!userId) throw new Error();
	} catch {
		event.cookies.delete('_boba_mahad_says_hi_session', {
			path: '/'
		});
		return resolve(event);
	}

	const [user] = await db
		.select()
		.from(usersWithTokens)
		.where(eq(usersWithTokens.id, userId!))
		.limit(1);

	if (!user) {
		event.cookies.delete('_boba_mahad_says_hi_session', {
			path: '/'
		});
		return resolve(event);
	}

	event.locals.user = user;

	console.log(`authMiddleware took ${performance.now() - start}ms`);
	return resolve(event);
};

const redirectMiddleware: Handle = async ({ event, resolve }) => {
	// Skip for API routes and public pages
	if (event.url.pathname.startsWith('/api/uploadthing')) return resolve(event);
	if (event.url.pathname.startsWith('/api/auth')) return resolve(event);
	if (event.url.pathname === '/login') return resolve(event);

	// Redirect unauthenticated users to login
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	// Redirect to welcome page if country is not set
	if (!event.locals.user.country && event.url.pathname !== '/welcome') {
		return redirect(302, '/welcome');
	}

	// Prevent non-admins from accessing admin pages
	if (!event.locals.user.isAdmin && event.url.pathname.includes('admin')) {
		return redirect(302, '/');
	}

	return resolve(event);
};

export const handle = sequence(authMiddleware, redirectMiddleware);
