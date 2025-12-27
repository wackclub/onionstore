<script lang="ts">
	import '@fontsource/space-mono';
	import '@fontsource/space-mono/700.css';
	import '../app.css';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { Toaster } from 'svelte-sonner';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();
</script>

<div class="min-h-screen w-full">
	{#if data.user}
		<nav class="fixed top-0 right-0 left-0 z-50 p-4">
			<div class="mx-auto max-w-6xl">
				<div class="retro-panel flex flex-wrap items-center justify-between gap-4 !p-3">
					<div class="flex items-center gap-4">
						<a href="/" class="flex items-center gap-2 no-underline hover:no-underline">
							<span class="text-xl">[</span>
							<span class="text-coffee-700 text-sm font-bold tracking-wider uppercase">Store</span>
							<span class="text-xl">]</span>
						</a>
						<span class="text-coffee-400">|</span>
						<div class="retro-chip">
							<span class="font-bold">{data.user.tokens}</span>
							<span class="text-xs">{data.user.tokens === 1 ? 'TOKEN' : 'TOKENS'}</span>
						</div>
						{#if data.user.isAdmin}
							<span class="retro-badge">ADMIN</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<a href="/" class="retro-btn-secondary !px-3 !py-2 text-xs">Home</a>
						<a href="/orders" class="retro-btn-secondary !px-3 !py-2 text-xs">Orders</a>
						{#if data.user.isAdmin}
							<a href="/admin" class="retro-btn !px-3 !py-2 text-xs">Admin</a>
						{/if}
					</div>
				</div>
			</div>
		</nav>
	{/if}
	<main class="w-full {data.user ? 'pt-28' : ''}">
		<div class="retro-shell">
			{@render children()}
		</div>
		<Toaster richColors />
	</main>
</div>
