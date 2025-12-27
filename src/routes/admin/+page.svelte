<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { items } = data;
</script>

<div class="flex flex-col gap-8">
	<section class="retro-panel">
		<div class="flex flex-wrap items-center justify-between gap-6">
			<div>
				<pre class="text-coffee-500 mb-2 text-xs">&gt; ADMIN TERMINAL v1.0</pre>
				<h1 class="retro-title text-2xl">Control Panel</h1>
				<p class="retro-subtitle mt-1">&gt; SYSTEM READY_</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<a href="/admin/users" class="retro-btn-secondary text-xs">[USERS]</a>
				<a href="/admin/orders" class="retro-btn-secondary text-xs">[ORDERS]</a>
				<a href="/admin/new" class="retro-btn text-xs">[+ NEW ITEM]</a>
			</div>
		</div>
	</section>

	{#if items.length > 0}
		<section>
			<div class="mb-6 flex items-center gap-3">
				<span class="text-coffee-400">&gt;&gt;</span>
				<h2 class="text-coffee-700 text-sm font-bold tracking-wider uppercase">Item Database</h2>
				<span class="border-coffee-300 flex-1 border-t-2 border-dashed"></span>
				<span class="text-coffee-500 text-xs">[{items.length} RECORDS]</span>
			</div>
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each items as item}
					<article class="retro-card flex h-full flex-col">
						<div
							class="bg-cream-200 border-coffee-700 relative aspect-[4/3] overflow-hidden border-b-2"
						>
							<img src={item.imageUrl} alt={item.name} class="h-full w-full object-cover" />
							<div class="absolute top-2 left-2">
								<span class="retro-badge">{item.type}</span>
							</div>
						</div>
						<div class="flex flex-1 flex-col gap-3 p-4">
							<h3 class="text-coffee-800 text-sm font-bold tracking-wide uppercase">{item.name}</h3>
							<p class="text-coffee-600 flex-1 text-xs leading-relaxed">{item.description}</p>
							<hr class="retro-divider" />
							<div class="flex items-center justify-between">
								<span class="retro-chip text-xs">
									<span class="font-bold">{item.price}</span>
									<span>TOKENS</span>
								</span>
							</div>
							{#if item.hcbMids && item.hcbMids.length > 0}
								<div
									class="text-coffee-500 bg-cream-200 border-coffee-400 border-2 border-dashed p-2 text-xs font-bold"
								>
									MIDs: {item.hcbMids.join(', ')}
								</div>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>
	{:else}
		<section class="retro-panel py-12 text-center">
			<pre class="text-coffee-400 mb-4 text-4xl">[ EMPTY ]</pre>
			<h3 class="text-coffee-700 mb-2 text-lg font-bold uppercase">No Items in Database</h3>
			<p class="text-coffee-500 mb-6 text-sm">&gt; CREATE FIRST ITEM TO BEGIN_</p>
			<a href="/admin/new" class="retro-btn">[CREATE ITEM]</a>
		</section>
	{/if}
</div>
