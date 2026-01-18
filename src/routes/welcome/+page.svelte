<script lang="ts">
	import { goto } from '$app/navigation';
	import countryList from 'country-list';

	let country = $state('');
	let name = $state('');
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
			const response = await fetch('/api/auth/update-user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ country, name })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'ERROR: UPDATE FAILED';
				loading = false;
				return;
			}

			goto('/');
		} catch (err) {
			error = 'ERROR: NETWORK FAILURE';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Welcome - Boba Olympics</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center">
	<div class="retro-panel w-full max-w-md">
		<div class="flex flex-col gap-6">
			<div class="text-center">
				<h1 class="retro-title text-2xl">Hey there!</h1>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="flex flex-col gap-4"
			>
				<div class="flex flex-col gap-2">
					<label for="name" class="retro-label">Preferred Name</label>
					<input id="name" type="text" bind:value={name} class="retro-input" />
				</div>

				<div class="flex flex-col gap-2">
					<label for="country" class="retro-label">Select Country</label>
					<select id="country" bind:value={country} required class="retro-input">
						<option value="">Select country...</option>
						{#each countries as c}
							<option value={c.code}>{c.name}</option>
						{/each}
					</select>
				</div>

				{#if error}
					<div class="border-2 border-red-700 bg-red-100 p-3 text-center font-bold text-red-700">
						{error}
					</div>
				{/if}

				<button type="submit" disabled={loading || !country} class="retro-btn w-full">
					{#if loading}
						PROCESSING
					{:else}
						CONTINUE
					{/if}
				</button>
			</form>
		</div>
	</div>
</div>
