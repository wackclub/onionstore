import { type } from 'arktype';

export function escapeLikePattern(pattern: string): string {
	return pattern.replace(/[%_\\]/g, '\\$&');
}

export const sendLinkSchema = type({
	email: 'string.email'
});

export const updateUserSchema = type({
	country: /^[A-Z]{2}$/,
	name: '0 < string <= 100'
});

export const createOrderSchema = type({
	shopItemId: 'string > 0'
});

export const updateOrderSchema = type({
	orderId: 'string > 0',
	status: "'approved' | 'rejected'",
	'memo?': 'string <= 1000'
});

export type SendLinkInput = typeof sendLinkSchema.infer;
export type UpdateCountryInput = typeof updateUserSchema.infer;
export type CreateOrderInput = typeof createOrderSchema.infer;
export type UpdateOrderInput = typeof updateOrderSchema.infer;
