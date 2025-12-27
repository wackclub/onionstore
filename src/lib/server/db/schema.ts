import {
	pgTable,
	pgView,
	integer,
	text,
	boolean,
	timestamp,
	varchar,
	decimal,
	index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const rawUsers = pgTable('user', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	email: text().notNull().unique(),
	displayName: text(),
	isAdmin: boolean().default(false).notNull(),
	country: varchar({ length: 2 }),
	createdAt: timestamp().notNull().defaultNow(),
	airtableRecordId: text(),
	totalEarnedPoints: integer().default(0).notNull(),
	pointsRedeemed: integer().default(0).notNull(),
	rating: integer(),
	review: text(),
	githubUrl: text(),
	websiteUrl: text(),
	description: text(),
	screenshotUrl: text(),
	addressLine1: text(),
	addressLine2: text(),
	state: text(),
	city: text(),
	zipPostal: text(),
	shippingCountry: text(),
	slackId: text()
});

export const loginTokens = pgTable(
	'login_tokens',
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => nanoid()),
		email: text().notNull(),
		token: text().notNull().unique(),
		expiresAt: timestamp().notNull(),
		createdAt: timestamp().notNull().defaultNow()
	},
	(table) => ({
		emailIdx: index('login_tokens_email_idx').on(table.email),
		tokenIdx: index('login_tokens_token_idx').on(table.token)
	})
);

export const shopItems = pgTable('shop_items', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text().notNull(),
	description: text().notNull(),
	imageUrl: text().notNull(),
	price: integer().notNull(),
	usd_cost: integer(),
	type: varchar({ enum: ['hcb', 'third_party'] }),
	hcbMids: text().array(),
	airtableRecordId: text()
});

export const shopOrders = pgTable(
	'shop_orders',
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => nanoid()),
		shopItemId: text()
			.notNull()
			.references(() => shopItems.id),
		priceAtOrder: integer().notNull(),
		status: varchar({ enum: ['pending', 'fulfilled', 'rejected'] })
			.default('pending')
			.notNull(),
		memo: text(),
		createdAt: timestamp().notNull().defaultNow(),
		userId: text()
			.notNull()
			.references(() => rawUsers.id),
		airtableRecordId: text()
	},
	(table) => ({
		userIdIdx: index('shop_orders_user_id_idx').on(table.userId),
		shopItemIdIdx: index('shop_orders_shop_item_id_idx').on(table.shopItemId),
		statusIdx: index('shop_orders_status_idx').on(table.status),
		createdAtIdx: index('shop_orders_created_at_idx').on(table.createdAt)
	})
);

export const payouts = pgTable(
	'payouts',
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => nanoid()),
		tokens: integer().notNull(),
		userId: text()
			.notNull()
			.references(() => rawUsers.id),
		memo: text(),
		createdAt: timestamp().notNull().defaultNow(),
		submittedToUnified: boolean().default(false).notNull(),
		baseHackatimeHours: decimal().default('0.0').notNull(),
		overridenHours: decimal().default('0.0'),
		airtableSubmissionId: text()
	},
	(table) => ({
		userIdIdx: index('payouts_user_id_idx').on(table.userId),
		createdAtIdx: index('payouts_created_at_idx').on(table.createdAt),
		submittedToUnifiedIdx: index('payouts_submitted_to_unified_idx').on(table.submittedToUnified),
		airtableSubmissionIdIdx: index('payouts_airtable_submission_id_idx').on(
			table.airtableSubmissionId
		)
	})
);

export const usersWithTokens = pgView('users_with_tokens').as((qb) => {
	return qb
		.select({
			id: rawUsers.id,
			email: rawUsers.email,
			displayName: rawUsers.displayName,
			isAdmin: rawUsers.isAdmin,
			country: rawUsers.country,
			tokens: sql<number>`
			GREATEST(
				COALESCE(
					(SELECT SUM(tokens) FROM payouts WHERE "userId" = "user"."id"),
					0
				) -
				COALESCE(
					(SELECT SUM("priceAtOrder") FROM shop_orders WHERE "userId" = "user"."id" AND status IN ('pending', 'fulfilled')),
					0
				),
				0
			)
		`.as('tokens')
		})
		.from(rawUsers);
});

export type UserWithTokens = typeof usersWithTokens.$inferSelect;
export type RawUser = typeof rawUsers.$inferSelect;
export type LoginToken = typeof loginTokens.$inferSelect;
export type ShopItem = typeof shopItems.$inferSelect;
export type ShopOrder = typeof shopOrders.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
