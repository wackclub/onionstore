<script lang="ts">
	import '@fontsource-variable/outfit';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { Toaster } from 'svelte-sonner';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<div class="w-full">
	{#if data.user}
		<nav class="fixed top-6 left-0 right-0 z-50 flex justify-center">
			<div
				class="flex flex-wrap items-center justify-center gap-5 rounded-full border border-[#e0c7a6] bg-[rgba(255,255,255,0.85)] px-6 py-3 shadow-[0_18px_34px_rgba(65,35,20,0.12)] backdrop-blur animate-bubble"
			>
				<div class="flex items-center gap-4">
					<div class="relative">
						{#if data.user.avatarUrl}
							<img
								src={data.user.avatarUrl}
								alt="Profile"
								class="h-11 w-11 rounded-2xl object-cover ring-2 ring-transparent motion-pop"
								class:ring-[#f2b46c]={data.user.isAdmin}
							/>
						{:else}
							<div
								class="h-11 w-11 flex items-center justify-center rounded-2xl bg-[#f8e2c1] text-xl font-bold text-[#8d5c3f] ring-2 ring-transparent motion-pop"
								class:ring-[#f2b46c]={data.user.isAdmin}
							>
								{(data.user.displayName || data.user.email)[0].toUpperCase()}
							</div>
						{/if}
						{#if data.user.isAdmin}
							<div
								class="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#f7c978] text-xs font-bold text-white shadow-[0_6px_10px_rgba(65,35,20,0.18)]"
								title="Administrator"
							>
								★
							</div>
						{/if}
					</div>
					<div class="flex flex-col items-start">
						<span class="boba-chip text-sm">
							<span class="text-lg font-semibold">{data.user.tokens}</span>
							<span>{data.user.tokens === 1 ? 'token' : 'tokens'}</span>
						</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<a href="/" class="boba-action motion-pop text-sm md:text-base">
						Home
					</a>
					<a href="/orders" class="boba-action motion-pop text-sm md:text-base">
						Orders
					</a>
					{#if data.user.isAdmin}
						<a href="/admin" class="boba-action motion-pop text-sm md:text-base">
							Admin
						</a>
					{/if}
				</div>
			</div>
		</nav>
	{/if}
	<main class="w-full mt-20">
		<div class="boba-shell">
			{@render children()}
		</div>
		<Toaster />
	</main>
</div>
