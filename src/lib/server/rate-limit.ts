import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

let redis: Redis | null = null;

function getRedis(): Redis | null {
	if (redis) return redis;

	const url = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;

	if (!url || !token) {
		console.warn(
			'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Rate limiting disabled.'
		);
		return null;
	}

	redis = new Redis({ url, token });
	return redis;
}

export interface RateLimitResult {
	success: boolean;
	remaining: number;
	reset: number;
}

export async function checkRateLimit(
	key: string,
	limit: number = 5,
	windowSeconds: number = 900
): Promise<RateLimitResult> {
	const client = getRedis();

	if (!client) {
		return {
			success: true,
			remaining: limit,
			reset: windowSeconds
		};
	}

	const now = Math.floor(Date.now() / 1000);
	const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

	const count = await client.incr(windowKey);

	if (count === 1) {
		await client.expire(windowKey, windowSeconds);
	}

	const ttl = await client.ttl(windowKey);

	return {
		success: count <= limit,
		remaining: Math.max(0, limit - count),
		reset: ttl > 0 ? ttl : windowSeconds
	};
}

export { redis };
