<script lang="ts">
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let loading = $state(false);
	let emailSent = $state(false);

	async function handleSubmit() {
		if (!email) {
			toast.error('Please enter your email address');
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (response.ok) {
				emailSent = true;
				toast.success('Check your email for a login link!');
			} else {
				toast.error(data.error || 'Failed to send login email');
			}
		} catch (error) {
			toast.error('An error occurred. Please try again.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-4xl font-bold text-[#412314]">Welcome to Onion Store</h1>
			<p class="mt-2 text-lg text-[#6b4423]">Sign in to continue</p>
		</div>

		{#if !emailSent}
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="mt-8 space-y-6">
				<div class="rounded-2xl border border-[#e0c7a6] bg-white p-8 shadow-lg">
					<label for="email" class="block text-sm font-medium text-[#412314]">
						Email address
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						disabled={loading}
						class="mt-2 block w-full rounded-lg border border-[#e0c7a6] px-4 py-3 text-[#412314] placeholder-[#b89968] focus:border-[#f2b46c] focus:outline-none focus:ring-2 focus:ring-[#f2b46c] disabled:opacity-50"
						placeholder="you@example.com"
					/>

					<button
						type="submit"
						disabled={loading}
						class="mt-6 w-full rounded-lg bg-gradient-to-br from-[#f7c978] to-[#f2b46c] px-6 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Sending...' : 'Send login link'}
					</button>
				</div>
			</form>
		{:else}
			<div class="rounded-2xl border border-[#e0c7a6] bg-white p-8 text-center shadow-lg">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7c978]">
					<span class="text-3xl">✓</span>
				</div>
				<h2 class="text-2xl font-bold text-[#412314]">Check your email</h2>
				<p class="mt-2 text-[#6b4423]">
					We've sent a login link to <strong>{email}</strong>
				</p>
				<p class="mt-4 text-sm text-[#b89968]">
					The link will expire in 15 minutes.
				</p>
			</div>
		{/if}
	</div>
</div>
