<script lang="ts">
	import { goto } from '$app/navigation';
	import countryList from 'country-list';

	let country = $state('');
	let loading = $state(false);
	let error = $state('');

	const countries = [
		...countryList.getData().map((c) => ({ code: c.code, name: c.name })),
		{ code: 'OTHER', name: 'Other' }
	].sort((a, b) => a.name.localeCompare(b.name));

	async function handleSubmit() {
		if (!country) return;

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/update-country', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ country })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to update country';
				loading = false;
				return;
			}

			goto('/');
		} catch (err) {
			error = 'Failed to update country';
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="boba-panel w-full max-w-md animate-bubble">
		<div class="flex flex-col gap-6">
			<div class="text-center">
				<h1 class="text-3xl font-semibold">welcome!</h1>
				<p class="boba-subtitle mt-2">where are you from?</p>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<label for="country" class="text-sm font-medium">select your country</label>
					<select
						id="country"
						bind:value={country}
						required
						class="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value="">choose a country...</option>
						{#each countries as c}
							<option value={c.code}>{c.name}</option>
						{/each}
					</select>
				</div>

				{#if error}
					<div class="rounded-lg bg-red-50 p-3 text-center text-sm text-red-800">
						{error}
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading || !country}
					class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? 'saving...' : 'continue'}
				</button>
			</form>
		</div>
	</div>
</div>
