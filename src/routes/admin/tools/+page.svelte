<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { toast } from 'svelte-sonner';

	let { form }: { form: ActionData } = $props();

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

	const handleClearTestOrders = createSyncHandler(
		'/api/admin/clear-test-orders',
		'Test orders cleared!'
	);

	const handleSyncSubmissions = createSyncHandler(
		'/api/admin/sync-submissions',
		'Submissions synced!'
	);

	$effect(() => {
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
				<h1 class="retro-title text-2xl">Admin Tools</h1>
			</div>
			<a href="/admin" class="retro-btn-secondary">BACK</a>
		</div>
	</section>

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

			<button type="submit" class="retro-btn w-full">GIVE TOKENS</button>
		</form>
	</section>

	<section class="retro-panel">
		<div class="space-y-4">
			<p class="text-coffee-600 text-lg leading-relaxed">
				<span class="font-bold uppercase">Sync approved submissions</span> from Airtable to create/update
				payout rows. Runs automatically every 10 minutes.
			</p>
			<button onclick={handleSyncSubmissions} class="retro-btn w-full"> SYNC SUBMISSIONS </button>
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
							>Success</span
						>
					</div>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-coffee-600">User:</span>
							<span class="text-coffee-800 font-bold">{form.user.email}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-coffee-600">Previous:</span>
							<span class="text-coffee-800 font-bold">{form.user.previousTotal} tokens</span>
						</div>
						<div class="flex justify-between">
							<span class="text-coffee-600">Change:</span>
							<span class="font-bold text-green-700">+{form.user.pointsChanged} tokens</span>
						</div>
						<hr class="border-coffee-400 my-2 border-t-2 border-dashed" />
						<div class="flex justify-between">
							<span class="text-coffee-700 font-bold">New Total:</span>
							<span class="text-coffee-800 text-lg font-bold">{form.user.newTotal} tokens</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-coffee-500 w-full text-center">
					<p>Results will appear here!</p>
				</div>
			{/if}
		</div>
	</section>
</div>
