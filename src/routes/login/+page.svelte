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
				error = data.error || 'ERROR: SEND FAILED';
				loading = false;
				return;
			}

			sent = true;
		} catch (err) {
			error = 'ERROR: NETWORK FAILURE';
			loading = false;
		}
	}
</script>

<div class="flex min-h-[80vh] items-center justify-center">
	<div class="retro-panel w-full max-w-md">
		<div class="flex flex-col gap-6">
			<div class="text-center">
				<h1 class="retro-title text-2xl">Welcome to Boba Olympics!</h1>
				<p class="retro-subtitle mt-2">ENTER CREDENTIALS TO ACCESS STORE</p>
			</div>

			{#if sent}
				<div class="border-2 border-green-700 bg-green-100 p-4 text-center">
					<pre class="mb-2 text-xs text-green-700">SUCCESS!</pre>
					<p class="text-sm font-bold text-green-800 uppercase">Check Your Email!</p>
					<p class="mt-1 text-xs text-green-700">MAGIC LINK TRANSMITTED</p>
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					class="flex flex-col gap-4"
				>
					<div class="flex flex-col gap-2">
						<label for="email" class="retro-label">&gt; Email Address</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							placeholder="user@domain.com"
							class="retro-input"
						/>
					</div>

					{#if error}
						<div
							class="border-2 border-red-700 bg-red-100 p-3 text-center text-xs font-bold text-red-700"
						>
							&gt; {error}
						</div>
					{/if}

					<button type="submit" disabled={loading || !email} class="retro-btn w-full">
						{#if loading}
							ONE SEC...
						{:else}
							SEND MAGIC LINK
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
