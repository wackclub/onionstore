<script lang="ts">
	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function handleSubmit() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/send-link', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to send login email';
				loading = false;
				return;
			}

			sent = true;
		} catch (err) {
			error = 'Failed to send login email';
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="boba-panel w-full max-w-md animate-bubble">
		<div class="flex flex-col gap-6">
			<div class="text-center">
				<h1 class="text-3xl font-semibold">welcome!</h1>
				<p class="boba-subtitle mt-2">sign in to access the store</p>
			</div>

			{#if sent}
				<div class="rounded-lg bg-green-50 p-4 text-center text-green-800">
					<p class="font-medium">check your email!</p>
					<p class="mt-1 text-sm">we've sent you a magic link to sign in</p>
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="flex flex-col gap-4">
					<div class="flex flex-col gap-2">
						<label for="email" class="text-sm font-medium">email address</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							placeholder="your@email.com"
							class="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					{#if error}
						<div class="rounded-lg bg-red-50 p-3 text-center text-sm text-red-800">
							{error}
						</div>
					{/if}

					<button
						type="submit"
						disabled={loading || !email}
						class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
					>
						{loading ? 'sending...' : 'send magic link'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
