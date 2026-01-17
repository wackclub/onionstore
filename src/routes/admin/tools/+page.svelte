<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { toast } from 'svelte-sonner';

	let { form }: { form: ActionData } = $props();
	let dangerZoneUnlocked = $state(false);

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
				<pre class="text-coffee-500 mb-2">ADMIN TOOLS v2.0</pre>
				<h1 class="retro-title text-2xl">System Tools</h1>
				<p class="retro-subtitle mt-1">TOKEN MANAGEMENT_</p>
			</div>
			<a href="/admin" class="retro-btn-secondary">[BACK]</a>
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

			<button type="submit" class="retro-btn w-full">[GIVE TOKENS]</button>
		</form>
	</section>

	<section class="retro-panel relative">
		<div class="mb-6 flex items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<span class="text-coffee-400">&gt;&gt;</span>
				<h2 class="text-coffee-700 font-bold tracking-wider uppercase">Danger Zone</h2>
			</div>
			{#if !dangerZoneUnlocked}
				<div class="flex items-center gap-2">
					<svg class="h-6 w-6 text-red-700" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"
						/>
						<circle cx="12" cy="16" r="1.5" />
					</svg>
					<span class="text-sm font-bold text-red-700 uppercase">Locked</span>
				</div>
			{/if}
		</div>

		{#if !dangerZoneUnlocked}
			<!-- Locked Overlay -->
			<div class="relative">
				<div class="border-2 border-red-500 bg-red-900/20 p-4 blur-sm">
					<div class="space-y-4 opacity-50">
						<div class="border-2 border-red-300 bg-red-100 p-4">
							<h3 class="mb-2 font-bold text-red-700 uppercase">Clear All Test Orders</h3>
							<p class="mb-4 leading-relaxed text-red-600">
								Delete all shop orders from the database.
							</p>
							<button
								disabled
								class="w-full border-2 border-black bg-gray-400 px-6 py-2 font-bold text-white uppercase"
							>
								[LOCKED]
							</button>
						</div>
					</div>
				</div>

				<!-- Lock Screen -->
				<div
					class="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-red-100/95 to-red-50/95"
				>
					<div class="border-coffee-700 bg-cream-50 border-4 p-8 text-center">
						<svg
							class="mx-auto mb-4 h-24 w-24 text-red-700"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"
							/>
							<circle cx="12" cy="16" r="1.5" />
							<path d="M12 17.5v2" />
						</svg>
						<h3 class="text-coffee-800 mb-2 font-mono text-xl font-bold uppercase">
							[DANGER ZONE LOCKED]
						</h3>
						<p class="text-coffee-700 mb-6 font-mono text-sm">
							&gt; These destructive actions are protected_<br />
							&gt; Ask Rushmore to unlock manually_
						</p>
						<div class="border-coffee-400 bg-cream-100 inline-block border-2 px-6 py-3">
							<p class="text-coffee-600 font-mono text-xs">
								SECURITY: ENABLED<br />
								PROTECTION: ACTIVE
							</p>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Unlocked State -->
			<div class="space-y-4">
				<div class="border-2 border-yellow-500 bg-yellow-50 p-4">
					<div class="mb-4 flex items-center gap-2">
						<svg class="h-5 w-5 text-yellow-700" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M12 2C9.243 2 7 4.243 7 7v1h1V7c0-1.654 1.346-3 3-3s3 1.346 3 3v1h1V7c0-2.757-2.243-5-5-5z"
							/>
							<path
								d="M18 10H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2zm0 10H6v-8h12v8z"
							/>
						</svg>
						<span class="font-bold text-yellow-700 uppercase">Unlocked - Proceed with Caution</span>
					</div>
				</div>

				<div class="border-2 border-red-500 bg-red-50 p-4">
					<h3 class="mb-2 font-bold text-red-700 uppercase">Clear All Test Orders</h3>
					<p class="mb-4 leading-relaxed text-red-600">Delete all shop orders from the database.</p>
					<button
						onclick={handleClearTestOrders}
						class="w-full border-2 border-black bg-red-600 px-6 py-2 font-bold text-white uppercase transition-colors hover:bg-red-700"
					>
						[CLEAR ORDERS]
					</button>
				</div>

				<button
					onclick={() => {
						dangerZoneUnlocked = false;
						toast.info('Danger Zone locked');
					}}
					class="border-coffee-700 bg-cream-100 hover:bg-cream-200 w-full border-2 px-6 py-2 font-bold uppercase transition-colors"
				>
					[LOCK DANGER ZONE]
				</button>
			</div>
		{/if}
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
					<pre class="mb-2 text-2xl">[ ]</pre>
					<p>RESULTS WILL APPEAR HERE_</p>
				</div>
			{/if}
		</div>
	</section>
</div>
