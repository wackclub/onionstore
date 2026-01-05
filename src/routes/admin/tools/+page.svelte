<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function createSyncHandler(endpoint: string, successMessage: string) {
		return async () => {
			try {
				const response = await fetch(endpoint, { method: 'POST' });

				if (!response.ok) {
					const result = await response.json();
					throw new Error(result.error || 'Operation failed');
				}

				const result = await response.json();
				toast.success(result.message || successMessage);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error occurred';
				toast.error(message);
			}
		};
	}

	const handleSyncAirtable = createSyncHandler(
		'/api/admin/sync-airtable',
		'Airtable sync completed!'
	);
	const handleSyncSubmissions = createSyncHandler(
		'/api/admin/sync-submissions',
		'Submissions synced! Tokens updated.'
	);

	const handleClearTestOrders = createSyncHandler(
		'/api/admin/clear-test-orders',
		'Test orders cleared!'
	);

	const handleSyncShopItems = async () => {
		try {
			const [itemsResponse, ordersResponse] = await Promise.all([
				fetch('/api/admin/sync-shop-items-from-airtable', { method: 'POST' }),
				fetch('/api/admin/sync-shop-orders-from-airtable', { method: 'POST' })
			]);

			const itemsResult = await itemsResponse.json();
			const ordersResult = await ordersResponse.json();

			if (itemsResponse.ok && ordersResponse.ok) {
				toast.success('Shop items & orders synced from Airtable!');
			} else {
				const errors = [];
				if (!itemsResponse.ok) errors.push(`Items: ${itemsResult.error}`);
				if (!ordersResponse.ok) errors.push(`Orders: ${ordersResult.error}`);
				toast.error(errors.join(' | '));
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Unknown error occurred');
		}
	};

	$effect(() => {
		if (form?.connectionStatus === 'success') {
			toast.success('Airtable connection successful!');
		} else if (form?.connectionStatus === 'error') {
			toast.error('Airtable connection failed');
		}

		if (form?.givePointsSuccess) {
			toast.success('Points updated successfully!');
		} else if (form?.givePointsError) {
			toast.error(form.givePointsError);
		}
	});
</script>

<div class="flex flex-col gap-8">
	<section class="retro-panel">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<pre class="text-coffee-500 mb-2">ADMIN TOOLS v2.0</pre>
				<h1 class="retro-title text-2xl">System Tools</h1>
				<p class="retro-subtitle mt-1">AIRTABLE SYNC & MANAGEMENT_</p>
			</div>
			<a href="/admin" class="retro-btn-secondary">[BACK]</a>
		</div>
	</section>

	<div class="grid gap-6 lg:grid-cols-2">
		<section class="retro-panel">
			<div class="mb-6 flex items-center gap-3">
				<h2 class="text-coffee-700 font-bold tracking-wider uppercase">Airtable Connection</h2>
			</div>

			<div class="space-y-4">
				<div class="border-coffee-400 bg-cream-100 flex items-center gap-3 border-2 p-3">
					<div
						class="border-coffee-600 flex h-10 w-10 shrink-0 items-center justify-center border-2 text-lg font-bold {data.hasAirtableKey
							? 'bg-green-200 text-green-700'
							: 'bg-red-200 text-red-700'}"
					>
						{data.hasAirtableKey ? '✓' : '✗'}
					</div>
					<div class="min-w-0 flex-1">
						<div class="text-coffee-700 font-bold uppercase">API Key Status</div>
						<div class="text-coffee-600 truncate">
							{data.hasAirtableKey ? 'Configured' : 'Not configured'}
						</div>
					</div>
				</div>

				<form method="POST" action="?/checkAirtableConnection" use:enhance>
					<button type="submit" class="retro-btn w-full" disabled={!data.hasAirtableKey}>
						[TEST CONNECTION]
					</button>
				</form>
			</div>
		</section>

		<section class="retro-panel">
			<div class="mb-6 flex items-center gap-3">
				<span class="text-coffee-400">&gt;&gt;</span>
				<h2 class="text-coffee-700 font-bold tracking-wider uppercase">Sync Operations</h2>
			</div>

			<div class="space-y-4">
				<div class="border-coffee-400 bg-cream-100 border-2 p-4">
					<h3 class="text-coffee-700 mb-2 font-bold uppercase">Sync Users from Airtable</h3>
					<p class="text-coffee-600 mb-4 leading-relaxed">
						Pull all user data from the Onion Wars Airtable (emails, points, addresses, admin
						status) and update the local database.
					</p>
					<button
						onclick={handleSyncAirtable}
						disabled={!data.hasAirtableKey}
						class="retro-btn-secondary w-full disabled:opacity-50"
					>
						[SYNC NOW]
					</button>
				</div>

				<div class="border-coffee-400 bg-cream-100 border-2 p-4">
					<h3 class="text-coffee-700 mb-2 font-bold uppercase">
						Sync Submissions (Ratings → Tokens)
					</h3>
					<p class="text-coffee-600 mb-4 leading-relaxed">
						Pull approved submissions from Airtable and create/update token payouts based on
						ratings. This is how users earn tokens!
					</p>
					<button
						onclick={handleSyncSubmissions}
						disabled={!data.hasAirtableKey}
						class="retro-btn-secondary w-full disabled:opacity-50"
					>
						[SYNC SUBMISSIONS]
					</button>
				</div>

				<div class="border-coffee-400 bg-cream-100 border-2 p-4">
					<h3 class="text-coffee-700 mb-2 font-bold uppercase">Sync Shop Items & Orders</h3>
					<p class="text-coffee-600 mb-4 leading-relaxed">
						Pull shop items and order statuses from Airtable. Updates item details and order status
						(Pending/Approved/Rejected).
					</p>
					<button
						disabled={!data.hasAirtableKey}
						onclick={handleSyncShopItems}
						class="retro-btn-secondary w-full disabled:opacity-50"
					>
						[SYNC ITEMS]
					</button>
				</div>
			</div>
		</section>
	</div>

	<section class="retro-panel">
		<div class="mb-6 flex items-center gap-3">
			<span class="text-coffee-400">&gt;&gt;</span>
			<h2 class="text-coffee-700 font-bold tracking-wider uppercase">Give Tokens</h2>
		</div>

		<form method="POST" action="?/givePoints" use:enhance class="grid gap-6 md:grid-cols-2">
			<div class="space-y-4">
				<div>
					<label for="email" class="text-coffee-700 mb-2 block font-bold uppercase">
						User Email
					</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						class="border-coffee-700 bg-cream-50 text-coffee-800 focus:border-coffee-900 w-full border-2 px-4 py-2 focus:outline-none"
						placeholder="user@example.com"
					/>
				</div>

				<div>
					<label for="points" class="text-coffee-700 mb-2 block font-bold uppercase">
						Tokens to Give
					</label>
					<input
						type="number"
						id="points"
						name="points"
						required
						min="1"
						class="border-coffee-700 bg-cream-50 text-coffee-800 focus:border-coffee-900 w-full border-2 px-4 py-2 focus:outline-none"
						placeholder="100"
					/>
					<p class="text-coffee-500 mt-2">Enter positive number (e.g., 100)</p>
				</div>

				<div>
					<label for="reason" class="text-coffee-700 mb-2 block font-bold uppercase">
						Reason (optional)
					</label>
					<input
						type="text"
						id="reason"
						name="reason"
						class="border-coffee-700 bg-cream-50 text-coffee-800 focus:border-coffee-900 w-full border-2 px-4 py-2 focus:outline-none"
						placeholder="Bonus for event participation"
					/>
				</div>
			</div>

			<button type="submit" class="retro-btn w-full">[GIVE TOKENS]</button>
		</form>
	</section>

	<section class="retro-panel">
		<div class="mb-6 flex items-center gap-3">
			<span class="text-coffee-400">&gt;&gt;</span>
			<h2 class="text-coffee-700 font-bold tracking-wider uppercase">Danger Zone</h2>
		</div>

		<div class="space-y-4">
			<div class="border-red-500 bg-red-50 border-2 p-4">
				<h3 class="text-red-700 mb-2 font-bold uppercase">Clear All Test Orders</h3>
				<p class="text-red-600 mb-4 leading-relaxed">
					Delete all shop orders from the database. Use this after wiping Airtable to reset the system.
				</p>
				<button
					onclick={handleClearTestOrders}
					class="bg-red-600 hover:bg-red-700 w-full border-2 border-black px-6 py-2 font-bold uppercase text-white transition-colors"
				>
					[CLEAR ORDERS]
				</button>
			</div>
		</div>
	</section>

	<section class="retro-panel">
		<div class="mb-6 flex items-center gap-3">
			<span class="text-coffee-400">&gt;&gt;</span>
			<h2 class="text-coffee-700 font-bold tracking-wider uppercase">Give Tokens Result</h2>
		</div>

		<div class="border-coffee-400 bg-cream-100 flex items-center border-2 p-6">
			{#if form?.givePointsSuccess && form?.user}
				<div class="w-full space-y-3">
					<div class="text-coffee-700 mb-3 flex items-center gap-2 font-bold uppercase">
						<span class="border-2 border-green-700 bg-green-200 px-2 py-1 text-green-700"
							>✓ Success</span
						>
					</div>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-coffee-600">User:</span>
							<span class="text-coffee-800 font-bold">{form.user.email}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-coffee-600">Previous:</span>
							<span class="text-coffee-800 font-bold">{form.user.previousTotal} points</span>
						</div>
						<div class="flex justify-between">
							<span class="text-coffee-600">Change:</span>
							<span class="font-bold text-green-700">+{form.user.pointsChanged} points</span>
						</div>
						<hr class="border-coffee-400 my-2 border-t-2 border-dashed" />
						<div class="flex justify-between">
							<span class="text-coffee-700 font-bold">New Total:</span>
							<span class="text-coffee-800 text-lg font-bold">{form.user.newTotal} points</span>
						</div>
					</div>
					{#if form.airtableSynced ?? data.hasAirtableKey}
						<p class="text-coffee-600 mt-4">✓ Synced to Airtable</p>
					{/if}
				</div>
			{:else}
				<div class="text-coffee-500 w-full text-center">
					<pre class="mb-2 text-2xl">[ ]</pre>
					<p>RESULTS WILL APPEAR HERE_</p>
				</div>
			{/if}
		</div>
	</section>
</div>
