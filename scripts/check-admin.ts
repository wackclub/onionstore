import { db } from '../src/lib/server/db';
import { rawUsers } from '../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

const email = 'rushilchopra@gmail.com';

async function checkAdmin() {
	try {
		const user = await db
			.select()
			.from(rawUsers)
			.where(eq(rawUsers.email, email))
			.limit(1);

		if (user.length === 0) {
			console.log(`❌ No user found with email: ${email}`);
		} else {
			console.log(`✓ User found:`);
			console.log(`  Email: ${user[0].email}`);
			console.log(`  Display Name: ${user[0].displayName}`);
			console.log(`  Is Admin: ${user[0].isAdmin}`);
			console.log(`  ID: ${user[0].id}`);
		}
	} catch (error) {
		console.error('Failed to check admin:', error);
		process.exit(1);
	}
}

checkAdmin();
