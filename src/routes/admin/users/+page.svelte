<script lang="ts">
	import type { PageData } from './$types';

	type UserOrder = {
		id: string;
		userId: string;
		priceAtOrder: number;
		status: 'pending' | 'approved' | 'rejected';
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
		const userId = user.id;

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
				error: 'ERROR: COULD NOT LOAD ORDERS',
				data: null
			};
		}
	};
</script>

<div class="flex flex-col gap-8">
	<section class="retro-panel">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<pre class="text-coffee-500 mb-2">&gt; USER DATABASE</pre>
				<h1 class="retro-title text-2xl">User Management</h1>
				<p class="retro-subtitle mt-1">&gt; {users.length} USERS REGISTERED</p>
			</div>
			<a href="/admin" class="retro-btn-secondary">[BACK]</a>
		</div>
	</section>

	<section class="retro-panel-tight overflow-hidden !p-0">
		<div class="border-coffee-700 bg-cream-200 border-b-2 px-4 py-3">
			<h2 class="text-coffee-700 font-bold tracking-wider uppercase">&gt; User Records</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="min-w-full">
				<thead>
					<tr class="border-coffee-600 bg-cream-100 border-b-2">
						<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
							>User</th
						>
						<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
							>Tokens</th
						>
						<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
							>Role</th
						>
						<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
							>Orders</th
						>
						<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-coffee-300 divide-y-2">
					{#each users as user}
						<tr class="hover:bg-cream-100 transition-colors duration-100">
							<td class="px-4 py-3 whitespace-nowrap">
								<div class="flex items-center gap-3">
									<div
										class="border-coffee-600 bg-caramel text-coffee-900 flex h-10 w-10 items-center justify-center border-2 font-bold"
									>
										{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
									</div>
									<div>
										<div class="text-coffee-800 font-bold uppercase">
											{user.displayName || user.email}
										</div>
										{#if user.displayName && user.email}
											<div class="text-coffee-500">{user.email}</div>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-4 py-3 whitespace-nowrap">
								<span class="retro-chip">
									<span class="font-bold">{user.tokens}</span>
									<span>TKN</span>
								</span>
							</td>
							<td class="px-4 py-3 whitespace-nowrap">
								{#if user.isAdmin}
									<span class="retro-badge">ADMIN</span>
								{:else}
									<span class="text-coffee-500 font-bold">USER</span>
								{/if}
							</td>
							<td class="text-coffee-700 px-4 py-3 font-bold whitespace-nowrap">
								{user.orderCount}
								{user.orderCount === 1 ? 'ORDER' : 'ORDERS'}
							</td>
							<td class="px-4 py-3 whitespace-nowrap">
								<button
									onclick={() => toggleOrders(user)}
									class="text-coffee-600 hover:text-coffee-800 font-bold underline"
								>
									[{selectedUser === user.id ? 'HIDE' : 'VIEW'}]
								</button>
							</td>
						</tr>
						{#if selectedUser === user.id}
							{@const ordersState = userOrders[user.id]}
							<tr class="bg-cream-100">
								<td colspan="5" class="px-4 py-4">
									<div class="border-coffee-600 bg-cream-50 border-2 p-4">
										<h4 class="text-coffee-700 mb-3 font-bold tracking-wider uppercase">
											&gt; Order History
										</h4>
										<div class="space-y-2">
											{#if ordersState?.loading}
												<p class="text-coffee-600">LOADING</p>
											{:else if ordersState?.error}
												<p class="text-xs font-bold text-red-700">&gt; {ordersState.error}</p>
											{:else if ordersState?.data && ordersState.data.length > 0}
												{#each ordersState.data as order}
													<div
														class="border-coffee-400 bg-cream-100 flex flex-col gap-2 border-2 p-3"
													>
														<div class="flex flex-wrap items-center justify-between gap-3">
															<div
																class="text-coffee-800 flex items-center gap-2 font-bold uppercase"
															>
																{order.itemName ?? 'UNKNOWN'}
																{#if order.itemType}
																	<span class="retro-badge text-[10px]">{order.itemType}</span>
																{/if}
															</div>
															<span class="retro-chip">
																<span class="font-bold">{order.priceAtOrder}</span>
																<span>TKN</span>
															</span>
														</div>
														<div
															class="text-coffee-600 flex flex-wrap items-center justify-between gap-3"
														>
															<span
																class="px-2 py-1 font-bold uppercase {order.status === 'approved'
																	? 'border-2 border-green-700 bg-green-100 text-green-700'
																	: order.status === 'rejected'
																		? 'border-2 border-red-700 bg-red-100 text-red-700'
																		: 'border-2 border-yellow-700 bg-yellow-100 text-yellow-700'}"
															>
																[{order.status}]
															</span>
															<span class="font-bold"
																>{new Date(order.createdAt).toLocaleDateString()}</span
															>
														</div>
													</div>
												{/each}
											{:else}
												<p class="text-coffee-600">&gt; NO ORDERS ON RECORD</p>
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
	</section>

	<section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="retro-panel-tight flex items-center gap-4">
			<div
				class="border-coffee-600 bg-cream-200 text-coffee-700 flex h-12 w-12 items-center justify-center border-2 text-lg font-bold"
			>
				[U]
			</div>
			<div>
				<div class="text-coffee-500 font-bold tracking-wider uppercase">Total Users</div>
				<div class="text-coffee-800 text-2xl font-bold">{users.length}</div>
			</div>
		</div>
		<div class="retro-panel-tight flex items-center gap-4">
			<div
				class="border-coffee-600 bg-caramel text-coffee-900 flex h-12 w-12 items-center justify-center border-2 text-lg font-bold"
			>
				[T]
			</div>
			<div>
				<div class="text-coffee-500 font-bold tracking-wider uppercase">Total Tokens</div>
				<div class="text-coffee-800 text-2xl font-bold">
					{users.reduce((sum, user) => sum + Number(user.tokens), 0)}
				</div>
			</div>
		</div>
		<div class="retro-panel-tight flex items-center gap-4">
			<div
				class="border-coffee-600 bg-mocha text-coffee-900 flex h-12 w-12 items-center justify-center border-2 text-lg font-bold"
			>
				[O]
			</div>
			<div>
				<div class="text-coffee-500 font-bold tracking-wider uppercase">Total Orders</div>
				<div class="text-coffee-800 text-2xl font-bold">{totalOrders}</div>
			</div>
		</div>
	</section>
</div>
