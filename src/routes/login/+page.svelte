<script lang="ts">
	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function handleSubmit() {
		if (!email) return;

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/send-link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (response.ok) {
				sent = true;
			} else {
				error = data.message || 'Failed to send login link';
			}
		} catch (err) {
			error = 'Failed to send login link';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[80vh] items-center justify-center">
	<div class="retro-panel w-full max-w-md">
		<div class="flex flex-col gap-6">
			<div class="text-center">
				<h1 class="retro-title text-2xl">Welcome to Boba Olympics!</h1>
				<p class="retro-subtitle mt-2">Use the same email you used to submit your projects.</p>
			</div>

			{#if sent}
				<div class="border-coffee-400 bg-cream-100 border-2 p-6">
					<div class="text-coffee-700 mb-2 text-center text-sm font-bold uppercase">
						&gt; EMAIL SENT_
					</div>
					<p class="text-coffee-600 text-center text-sm">
						Check your inbox for a login link. It will expire in 15 minutes.
					</p>
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="flex flex-col gap-4">
					<div>
						<label for="email" class="text-coffee-700 mb-2 block text-sm font-bold uppercase">
							&gt; Email Address_
						</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							placeholder="your@email.com"
							required
							disabled={loading}
							class="retro-input w-full"
						/>
					</div>

					{#if error}
						<div class="border-red-500 bg-red-50 border-2 p-3 text-center">
							<p class="text-red-700 text-sm font-bold">&gt; ERROR: {error}</p>
						</div>
					{/if}

					<button
						type="submit"
						disabled={loading || !email}
						class="retro-btn w-full"
					>
						{loading ? '[SENDING...]' : '[SEND LOGIN LINK]'}
					</button>
				</form>
			{/if}

			<div class="border-coffee-400 border-t-2 border-dashed pt-4">
				<p class="text-coffee-500 text-center text-xs">
					&gt; SECURE AUTHENTICATION VIA EMAIL_
				</p>
			</div>
		</div>
	</div>
</div>
