<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let syncInProgress = $state(false);
	let syncStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let itemsSyncInProgress = $state(false);
	let itemsSyncStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	let submissionsSyncInProgress = $state(false);
	let submissionsSyncStatus = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	const handleSyncAirtable = async () => {
		syncInProgress = true;
		syncStatus = null;

		try {
			const response = await fetch('/api/admin/sync-airtable', {
				method: 'POST'
			});

			const result = await response.json();

			if (response.ok) {
				syncStatus = {
					type: 'success',
					message: result.message || 'Sync completed successfully'
				};
				toast.success('Airtable sync completed!');
			} else {
				syncStatus = {
					type: 'error',
					message: result.error || 'Sync failed'
				};
				toast.error('Sync failed');
			}
		} catch (error) {
			syncStatus = {
				type: 'error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			};
			toast.error('Sync failed');
		} finally {
			syncInProgress = false;
		}
	};

	const handleSyncShopItems = async () => {
		itemsSyncInProgress = true;
		itemsSyncStatus = null;

		try {
			const response = await fetch('/api/admin/sync-shop-items', {
				method: 'POST'
			});

			const result = await response.json();

			if (response.ok) {
				itemsSyncStatus = {
					type: 'success',
					message: result.message || 'Shop items sync completed successfully'
				};
				toast.success('Shop items synced to Airtable!');
			} else {
				itemsSyncStatus = {
					type: 'error',
					message: result.error || 'Shop items sync failed'
				};
				toast.error('Shop items sync failed');
			}
		} catch (error) {
			itemsSyncStatus = {
				type: 'error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			};
			toast.error('Shop items sync failed');
		} finally {
			itemsSyncInProgress = false;
		}
	};

	const handleSyncSubmissions = async () => {
		submissionsSyncInProgress = true;
		submissionsSyncStatus = null;

		try {
			const response = await fetch('/api/admin/sync-submissions', {
				method: 'POST'
			});

			const result = await response.json();

			if (response.ok) {
				submissionsSyncStatus = {
					type: 'success',
					message: result.message || 'Submissions synced successfully'
				};
				toast.success('Submissions synced! Tokens updated.');
			} else {
				submissionsSyncStatus = {
					type: 'error',
					message: result.error || 'Submissions sync failed'
				};
				toast.error('Submissions sync failed');
			}
		} catch (error) {
			submissionsSyncStatus = {
				type: 'error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			};
			toast.error('Submissions sync failed');
		} finally {
			submissionsSyncInProgress = false;
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
				<pre class="text-coffee-500 mb-2 text-xs">&gt; ADMIN TOOLS v2.0</pre>
				<h1 class="retro-title text-2xl">System Tools</h1>
				<p class="retro-subtitle mt-1">&gt; AIRTABLE SYNC & MANAGEMENT_</p>
			</div>
			<a href="/admin" class="retro-btn-secondary">[BACK]</a>
		</div>
	</section>

	<div class="grid gap-6 lg:grid-cols-2">
		<section class="retro-panel">
			<div class="mb-6 flex items-center gap-3">
				<span class="text-coffee-400">&gt;&gt;</span>
				<h2 class="text-coffee-700 text-sm font-bold tracking-wider uppercase">
					Airtable Connection
				</h2>
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
						<div class="text-coffee-700 text-xs font-bold uppercase">API Key Status</div>
						<div class="text-coffee-600 truncate text-xs">
							{data.hasAirtableKey ? 'Configured' : 'Not configured'}
						</div>
					</div>
				</div>

				{#if form?.connectionStatus}
					<div
						class="border-2 p-4 {form.connectionStatus === 'success'
							? 'border-green-700 bg-green-50'
							: 'border-red-700 bg-red-50'}"
					>
						<div
							class="mb-2 text-xs font-bold uppercase {form.connectionStatus === 'success' ? 'text-green-700' : 'text-red-700'}"
						>
							{form.connectionStatus === 'success' ? '✓ Success' : '✗ Error'}
						</div>
						<p class="text-coffee-700 text-xs">
							{form.message || form.error}
						</p>
						{#if form.baseId}
							<p class="text-coffee-600 mt-2 text-xs">Base ID: {form.baseId}</p>
						{/if}
					</div>
				{/if}

				<form method="POST" action="?/checkAirtableConnection" use:enhance>
					<button
						type="submit"
						class="retro-btn w-full"
						disabled={!data.hasAirtableKey}
					>
						[TEST CONNECTION]
					</button>
				</form>
			</div>
		</section>

		<section class="retro-panel">
			<div class="mb-6 flex items-center gap-3">
				<span class="text-coffee-400">&gt;&gt;</span>
				<h2 class="text-coffee-700 text-sm font-bold tracking-wider uppercase">Sync Operations</h2>
			</div>

			<div class="space-y-4">
				{#if syncStatus}
					<div
						class="border-2 p-4 {syncStatus.type === 'success'
							? 'border-green-700 bg-green-50'
							: 'border-red-700 bg-red-50'}"
					>
						<div
							class="mb-2 text-xs font-bold uppercase {syncStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}"
						>
							{syncStatus.type === 'success' ? '✓ Success' : '✗ Error'}
						</div>
						<p class="text-coffee-700 text-xs">{syncStatus.message}</p>
					</div>
				{/if}

				<div class="border-coffee-400 bg-cream-100 border-2 p-4">
					<h3 class="text-coffee-700 mb-2 text-xs font-bold uppercase">
						&gt; Sync Users from Airtable
					</h3>
					<p class="text-coffee-600 mb-4 text-xs leading-relaxed">
						Pull all user data from the Onion Wars Airtable (emails, points, addresses, admin
						status) and update the local database.
					</p>
					<button
						onclick={handleSyncAirtable}
						disabled={!data.hasAirtableKey || syncInProgress}
						class="retro-btn-secondary w-full disabled:opacity-50"
					>
						{syncInProgress ? '[SYNCING...]' : '[SYNC NOW]'}
					</button>
				</div>

				<div class="border-coffee-400 bg-cream-100 border-2 p-4">
					<h3 class="text-coffee-700 mb-2 text-xs font-bold uppercase">&gt; Sync Submissions (Ratings → Tokens)</h3>
					<p class="text-coffee-600 mb-4 text-xs leading-relaxed">
						Pull approved submissions from Airtable and create/update token payouts based on ratings. This is how users earn tokens!
					</p>
					{#if submissionsSyncStatus}
						<div
							class="mb-4 border-2 p-3 {submissionsSyncStatus.type === 'success'
								? 'border-green-700 bg-green-50'
								: 'border-red-700 bg-red-50'}"
						>
							<div
								class="mb-1 text-xs font-bold uppercase {submissionsSyncStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}"
							>
								{submissionsSyncStatus.type === 'success' ? '✓ Success' : '✗ Error'}
							</div>
							<p class="text-coffee-700 text-xs">{submissionsSyncStatus.message}</p>
						</div>
					{/if}
					<button
						onclick={handleSyncSubmissions}
						disabled={!data.hasAirtableKey || submissionsSyncInProgress}
						class="retro-btn-secondary w-full disabled:opacity-50"
					>
						{submissionsSyncInProgress ? '[SYNCING...]' : '[SYNC SUBMISSIONS]'}
					</button>
				</div>

				<div class="border-coffee-400 bg-cream-100 border-2 p-4">
					<h3 class="text-coffee-700 mb-2 text-xs font-bold uppercase">&gt; Sync Shop Items</h3>
					<p class="text-coffee-600 mb-4 text-xs leading-relaxed">
						Push all shop items from the local database to Airtable's Shop Items table.
					</p>
					{#if itemsSyncStatus}
						<div
							class="mb-4 border-2 p-3 {itemsSyncStatus.type === 'success'
								? 'border-green-700 bg-green-50'
								: 'border-red-700 bg-red-50'}"
						>
							<div
								class="mb-1 text-xs font-bold uppercase {itemsSyncStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}"
							>
								{itemsSyncStatus.type === 'success' ? '✓ Success' : '✗ Error'}
							</div>
							<p class="text-coffee-700 text-xs">{itemsSyncStatus.message}</p>
						</div>
					{/if}
					<button
						disabled={!data.hasAirtableKey || itemsSyncInProgress}
						class="retro-btn-secondary w-full disabled:opacity-50"
						onclick={handleSyncShopItems}
					>
						{itemsSyncInProgress ? '[SYNCING...]' : '[SYNC ITEMS]'}
					</button>
				</div>
			</div>
		</section>
	</div>

	<section class="retro-panel">
		<div class="mb-6 flex items-center gap-3">
			<span class="text-coffee-400">&gt;&gt;</span>
			<h2 class="text-coffee-700 text-sm font-bold tracking-wider uppercase">Give Tokens</h2>
		</div>

		<form
			method="POST"
			action="?/givePoints"
			use:enhance
			class="grid gap-6 md:grid-cols-2"
		>
			<div class="space-y-4">
				<div>
					<label for="email" class="text-coffee-700 mb-2 block text-xs font-bold uppercase">
						User Email
					</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						class="border-coffee-700 bg-cream-50 text-coffee-800 w-full border-2 px-4 py-2 text-sm focus:border-coffee-900 focus:outline-none"
						placeholder="user@example.com"
					/>
				</div>

				<div>
					<label for="points" class="text-coffee-700 mb-2 block text-xs font-bold uppercase">
						Tokens to Give
					</label>
					<input
						type="number"
						id="points"
						name="points"
						required
						min="1"
						class="border-coffee-700 bg-cream-50 text-coffee-800 w-full border-2 px-4 py-2 text-sm focus:border-coffee-900 focus:outline-none"
						placeholder="100"
					/>
					<p class="text-coffee-500 mt-2 text-xs">Enter positive number (e.g., 100)</p>
				</div>

				<div>
					<label for="reason" class="text-coffee-700 mb-2 block text-xs font-bold uppercase">
						Reason (optional)
					</label>
					<input
						type="text"
						id="reason"
						name="reason"
						class="border-coffee-700 bg-cream-50 text-coffee-800 w-full border-2 px-4 py-2 text-sm focus:border-coffee-900 focus:outline-none"
						placeholder="Bonus for event participation"
					/>
				</div>

				<button type="submit" class="retro-btn w-full">[GIVE TOKENS]</button>
			</div>

			<div class="border-coffee-400 bg-cream-100 flex items-center border-2 p-6">
				{#if form?.givePointsSuccess && form?.user}
					<div class="w-full space-y-3">
						<div
							class="text-coffee-700 mb-3 flex items-center gap-2 text-xs font-bold uppercase"
						>
							<span class="bg-green-200 text-green-700 border-2 border-green-700 px-2 py-1"
								>✓ Success</span
							>
						</div>
						<div class="space-y-2 text-xs">
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
								<span
									class="font-bold {form.user.pointsChanged > 0 ? 'text-green-700' : 'text-red-700'}"
								>
									{form.user.pointsChanged > 0 ? '+' : ''}{form.user.pointsChanged} points
								</span>
							</div>
							<hr class="border-coffee-400 my-2 border-t-2 border-dashed" />
							<div class="flex justify-between">
								<span class="text-coffee-700 font-bold">New Total:</span>
								<span class="text-coffee-800 text-lg font-bold">{form.user.newTotal} points</span>
							</div>
						</div>
						{#if data.hasAirtableKey}
							<p class="text-coffee-600 mt-4 text-xs">
								✓ Synced to Airtable
							</p>
						{/if}
					</div>
				{:else}
					<div class="text-coffee-500 w-full text-center text-xs">
						<pre class="mb-2 text-2xl">[ ]</pre>
						<p>&gt; RESULTS WILL APPEAR HERE_</p>
					</div>
				{/if}
			</div>
		</form>
	</section>
</div>
