import { db, payouts, rawUsers, usersWithTokens } from '../src/lib/server/db';
import { eq } from 'drizzle-orm';

async function checkPayouts() {
	try {
		// Get your user
		const user = await db.select().from(rawUsers).where(eq(rawUsers.email, 'rushilchopra@gmail.com')).limit(1);

		if (user.length === 0) {
			console.log('User not found!');
			return;
		}

		console.log('User:', user[0]);

		// Get all payouts for this user
		const userPayouts = await db.select().from(payouts).where(eq(payouts.userId, user[0].id));

		console.log('\nPayouts:');
		console.log(userPayouts);

		// Get user with tokens
		const userWithTokens = await db.select().from(usersWithTokens).where(eq(usersWithTokens.id, user[0].id)).limit(1);

		console.log('\nUser with tokens:');
		console.log(userWithTokens);

		process.exit(0);
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

checkPayouts();
