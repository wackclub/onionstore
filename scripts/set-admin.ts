import { db } from '../src/lib/server/db';
import { rawUsers } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

const email = 'rushilchopra@gmail.com';

async function setAdmin() {
	try {
		const result = await db
			.update(rawUsers)
			.set({ isAdmin: true })
			.where(eq(rawUsers.email, email))
			.returning();

		if (result.length === 0) {
			console.log(`No user found with email: ${email}`);
			console.log('Creating user with admin privileges...');

			await db.insert(rawUsers).values({
				email,
				isAdmin: true,
				displayName: 'Rushil Chopra'
			});

			console.log(`✓ Created user ${email} as admin`);
		} else {
			console.log(`✓ Set ${email} as admin`);
		}
	} catch (error) {
		console.error('Failed to set admin:', error);
		process.exit(1);
	}
}

setAdmin();
