import { fail, redirect } from '@sveltejs/kit';
import { db, shopItems } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;
		const imageUrl = formData.get('imageUrl') as string;
		const price = parseInt(formData.get('price') as string);
		const usdCost = parseFloat(formData.get('usd-cost') as string);
		const type = formData.get('type') as 'hcb' | 'third_party';
		const hcbMids = formData.get('hcbMids') as string;

		if (!name || !description || !imageUrl || !price || !usdCost || !type) {
			return fail(400, {
				error: 'All fields are required',
				name,
				description,
				imageUrl,
				price: price.toString(),
				usdCost: usdCost.toString(),
				type,
				hcbMids
			});
		}

		try {
			await db.insert(shopItems).values({
				name,
				description,
				imageUrl,
				price,
				usd_cost: usdCost,
				type,
				hcbMids: hcbMids ? hcbMids.split(',').map((mid) => mid.trim()) : null
			});

			return { success: true };
		} catch {
			return fail(500, {
				error: 'Failed to create item',
				name,
				description,
				imageUrl,
				price: price.toString(),
				usdCost: usdCost.toString(),
				type,
				hcbMids
			});
		}
	}
};
