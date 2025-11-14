<script lang="ts">
	import type { PageData } from './$types';

	type UserOrder = {
		id: string;
		userId: string;
		priceAtOrder: number;
		status: 'pending' | 'fulfilled' | 'rejected';
		createdAt: string;
		itemName: string | null;
		itemType: string | null;
	};

	type OrdersState = {
		loading: boolean;
		error: string | null;
		data: UserOrder[] | null;
	};

	let { data }: { data: PageData } = $props();
	const { users, totalOrders } = data;

	let selectedUser = $state<string | null>(null);
	let userOrders = $state<Record<string, OrdersState>>({});

	const toggleOrders = async (user: PageData['users'][number]) => {
		const userId = user.email;

		if (selectedUser === userId) {
			selectedUser = null;
			return;
		}

		selectedUser = userId;

		const current = userOrders[userId];
		if (current?.data || current?.loading) {
			return;
		}

		if (user.orderCount === 0) {
			userOrders[userId] = {
				loading: false,
				error: null,
				data: []
			};
			return;
		}

		userOrders[userId] = {
			loading: true,
			error: null,
			data: null
		};

		try {
			const response = await fetch(`/api/admin/users/${userId}/orders`);

			if (!response.ok) {
				throw new Error(`Failed to load orders (${response.status})`);
			}

			const body = await response.json();

			userOrders[userId] = {
				loading: false,
				error: null,
				data: body.orders ?? []
			};
		} catch (error) {
			console.error('Failed to fetch orders', error);

			userOrders[userId] = {
				loading: false,
				error: 'Could not load orders. Please try again.',
				data: null
			};
		}
	};
</script>

<div class="flex flex-col gap-10">
	<section class="boba-panel animate-bubble flex flex-wrap items-center justify-between gap-6">
		<h1 class="text-3xl font-semibold text-stone-900">User Management</h1>
		<a href="/admin" class="boba-action motion-pop text-sm md:text-base">
			Back to Admin
		</a>
	</section>

	<section class="boba-panel-tight animate-bubble overflow-hidden">
		<div class="border-b border-[#ead2b2] px-6 py-4">
			<h2 class="text-xl font-semibold text-stone-900">Users &amp; Tokens</h2>
		</div>
		<div class="px-2 py-4 sm:px-6">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-[#ead2b2]">
					<thead class="bg-[rgba(242,214,172,0.35)] text-left uppercase tracking-wide text-xs text-stone-600">
						<tr>
							<th class="px-6 py-3">User</th>
							<th class="px-6 py-3">Tokens</th>
							<th class="px-6 py-3">Admin</th>
							<th class="px-6 py-3">Orders</th>
							<th class="px-6 py-3">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#ead2b2]">
						{#each users as user}
							<tr class="transition hover:bg-[rgba(244,213,178,0.35)]">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-3">
										{#if user.avatarUrl}
											<div class="h-11 w-11 overflow-hidden rounded-2xl bg-[#f8e2c1]">
												<img src={user.avatarUrl} alt="Avatar" class="h-full w-full object-cover" />
											</div>
										{:else}
											<div class="h-11 w-11 flex items-center justify-center rounded-2xl bg-[#f8e2c1] text-xl font-bold text-[#8d5c3f]">
												{(user.displayName || user.email)[0].toUpperCase()}
											</div>
										{/if}
										<div class="text-sm font-semibold text-stone-900">
											{user.displayName || user.email}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="boba-chip text-xs sm:text-sm">
										<span class="text-base font-bold">{user.tokens}</span>
										<span>{Number(user.tokens) === 1 ? 'token' : 'tokens'}</span>
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if user.isAdmin}
										<span class="boba-badge text-xs uppercase tracking-[0.16em]">Admin</span>
									{:else}
										<span class="text-sm font-medium text-stone-500">User</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-stone-800">
									{user.orderCount} {user.orderCount === 1 ? 'order' : 'orders'}
								</td>
								<td class="px-6 py-4 text-sm font-semibold whitespace-nowrap">
									<button
										onclick={() => toggleOrders(user)}
										class="text-[#8d5c3f] transition hover:text-[#5b3522]"
									>
										{selectedUser === user.email ? 'Hide' : 'View'} Orders
									</button>
								</td>
							</tr>
							{#if selectedUser === user.email}
								{@const ordersState = userOrders[user.email]}
								<tr class="bg-[rgba(244,213,178,0.25)]">
									<td colspan="5" class="px-6 py-4">
										<div class="space-y-3 rounded-2xl border border-[#ead2b2] bg-[rgba(255,255,255,0.6)] p-4">
											<h4 class="text-sm font-semibold uppercase tracking-wider text-stone-700">
												Order History
											</h4>
											<div class="space-y-2 text-sm">
												{#if ordersState?.loading}
													<p class="text-stone-600">Loading orders…</p>
												{:else if ordersState?.error}
													<p class="text-red-600">{ordersState.error}</p>
												{:else if ordersState?.data && ordersState.data.length > 0}
													{#each ordersState.data as order}
														<div class="boba-panel-tight flex flex-col gap-3 bg-[rgba(255,255,255,0.85)] p-4">
															<div class="flex flex-wrap items-center justify-between gap-3">
																<div class="flex items-center gap-3 text-sm font-medium text-stone-900">
																	{order.itemName ?? 'Unknown item'}
																	{#if order.itemType}
																		<span class="boba-badge text-[10px] uppercase tracking-[0.2em]">
																			{order.itemType}
																		</span>
																	{/if}
																</div>
																<span class="boba-chip text-xs">
																	<span class="text-base font-bold">{order.priceAtOrder}</span>
																	<span>tokens</span>
																</span>
															</div>
															<div class="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
																<span
																	class="inline-flex items-center rounded-full px-3 py-1 font-semibold
																	{order.status === 'fulfilled'
																		? 'bg-[#d5f5d4] text-[#2f7d43]'
																		: order.status === 'rejected'
																			? 'bg-[#f6c4c0] text-[#963135]'
																			: 'bg-[#f7d8a7] text-[#7a4b21]'}"
																>
																	{order.status}
																</span>
																<span>
																	{new Date(order.createdAt).toLocaleDateString()}
																</span>
															</div>
														</div>
													{/each}
												{:else}
													<p class="text-stone-600">No orders yet.</p>
												{/if}
											</div>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>

	<section class="grid grid-cols-1 gap-6 sm:grid-cols-3">
		<div class="boba-panel-tight flex items-center gap-4 animate-bubble" style:animation-delay="0.05s">
			<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f2d6ac] text-xl">
				👥
			</div>
			<div>
				<div class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Total Users</div>
				<div class="text-xl font-semibold text-stone-900">{users.length}</div>
			</div>
		</div>
		<div class="boba-panel-tight flex items-center gap-4 animate-bubble" style:animation-delay="0.1s">
			<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1c696] text-xl">
				🪙
			</div>
			<div>
				<div class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Total Tokens</div>
				<div class="text-xl font-semibold text-stone-900">
					{users.reduce((sum, user) => sum + Number(user.tokens), 0)}
				</div>
			</div>
		</div>
		<div class="boba-panel-tight flex items-center gap-4 animate-bubble" style:animation-delay="0.15s">
			<div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f7c978] text-xl">
				📦
			</div>
			<div>
				<div class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Total Orders</div>
				<div class="text-xl font-semibold text-stone-900">{totalOrders}</div>
			</div>
		</div>
	</section>
</div>
