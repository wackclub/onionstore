import { env } from '$env/dynamic/private';
import { ourFileRouter } from '$lib/server/uploadthing';
import type { RequestHandler } from './$types';
import { createRouteHandler } from 'uploadthing/server';

const handler = createRouteHandler({
	router: ourFileRouter,
	config: {
		token: env.UPLOADTHING_TOKEN
	}
});

export const GET: RequestHandler = async (event) => {
	return handler(event.request);
};

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	if (!event.locals.user.isAdmin) {
		return new Response(JSON.stringify({ error: 'Admin access required' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	return handler(event.request);
};
