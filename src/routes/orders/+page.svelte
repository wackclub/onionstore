<script lang="ts">
	import type { PageData } from './$types';
	import { formatDate, getStatusColor } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();
	const { orders } = data;
</script>

<div class="flex flex-col gap-8">
	<section class="retro-panel">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="retro-title text-2xl">Order History</h1>
				<p class="retro-subtitle mt-1">
					{#if orders.length === 0}
						No records found :c
					{:else}
						{orders.length} {orders.length === 1 ? 'order' : 'orders'} on file.
					{/if}
				</p>
			</div>
			<a href="/" class="retro-btn-secondary">BROWSE STORE</a>
		</div>
	</section>

	{#if orders.length === 0}
		<section class="retro-panel py-12 text-center">
			<pre class="text-coffee-400 mb-4 text-4xl">[ NO DATA ]</pre>
			<h3 class="text-coffee-700 mb-2 text-lg font-bold uppercase">Empty Order Log</h3>
			<p class="text-coffee-500 mb-6">PURCHASE ITEMS TO POPULATE THIS LIST</p>
			<a href="/" class="retro-btn">START SHOPPING</a>
		</section>
	{:else}
		<section class="retro-panel-tight overflow-hidden !p-0">
			<div class="overflow-x-auto">
				<table class="min-w-full">
					<thead>
						<tr class="border-coffee-700 bg-cream-200 border-b-2">
							<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
								>Item</th
							>
							<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
								>Cost</th
							>
							<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
								>Status</th
							>
							<th class="text-coffee-700 px-4 py-3 text-left font-bold tracking-wider uppercase"
								>Date</th
							>
						</tr>
					</thead>
					<tbody class="divide-coffee-300 divide-y-2">
						{#each orders as order}
							<tr class="hover:bg-cream-100 transition-colors duration-100">
								<td class="px-4 py-3 whitespace-nowrap">
									<div class="flex items-center gap-3">
										<div class="border-coffee-600 bg-cream-200 h-10 w-10 overflow-hidden border-2">
											<img
												src={order.itemImageUrl}
												alt={order.itemName}
												class="h-full w-full object-cover"
											/>
										</div>
										<span class="text-coffee-800 font-bold uppercase">{order.itemName}</span>
									</div>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="retro-chip">
										<span class="font-bold">{order.priceAtOrder}</span>
										<span>TKN</span>
									</span>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span
										class="inline-flex px-2 py-1 font-bold uppercase {getStatusColor(order.status)}"
									>
										[{order.status}]
									</span>
								</td>
								<td class="text-coffee-600 px-4 py-3 font-bold whitespace-nowrap">
									{formatDate(order.createdAt)}
								</td>
							</tr>
							{#if order.memo}
								<tr class="bg-cream-100">
									<td colspan="5" class="px-4 py-2">
										<div class="text-coffee-600">
											<span class="text-coffee-700 font-bold">NOTE:</span>
											{order.memo}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="retro-panel-tight flex items-center gap-4">
				<div
					class="border-coffee-600 flex h-12 w-12 items-center justify-center border-2 bg-yellow-100 text-xl font-bold"
				>
					P
				</div>
				<div>
					<div class="text-coffee-800 text-2xl font-bold">
						{orders.filter((o) => o.status === 'pending').length}
					</div>
					<div class="text-coffee-500 font-bold uppercase">Pending</div>
				</div>
			</div>
			<div class="retro-panel-tight flex items-center gap-4">
				<div
					class="border-coffee-600 flex h-12 w-12 items-center justify-center border-2 bg-green-100 text-xl font-bold"
				>
					A
				</div>
				<div>
					<div class="text-2xl font-bold text-green-700">
						{orders.filter((o) => o.status === 'approved').length}
					</div>
					<div class="text-coffee-500 font-bold uppercase">Approved</div>
				</div>
			</div>
			<div class="retro-panel-tight flex items-center gap-4">
				<div
					class="border-coffee-600 flex h-12 w-12 items-center justify-center border-2 bg-red-100 text-xl font-bold"
				>
					R
				</div>
				<div>
					<div class="text-2xl font-bold text-red-700">
						{orders.filter((o) => o.status === 'rejected').length}
					</div>
					<div class="text-coffee-500 font-bold uppercase">Rejected</div>
				</div>
			</div>
		</section>
	{/if}
</div>
