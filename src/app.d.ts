import type { UserWithTokens } from '$lib/server/db';

declare global {
	namespace App {
		interface Locals {
			user: UserWithTokens;
		}
	}
}

export {};
