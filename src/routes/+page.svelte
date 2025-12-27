<script lang="ts">
	import type { PageProps } from './$types';
	import ItemCard from '$lib/components/shop/item-card.svelte';

	let { data }: PageProps = $props();
	const { user, items } = data;
</script>

<div class="flex flex-col gap-8">
	<section class="retro-panel py-8 text-center">
		<div class="mx-auto flex max-w-2xl flex-col gap-4">
			<h1 class="retro-title">Welcome to the Store</h1>
			<p class="retro-subtitle">
				{#if data.user.tokens === 0}
					STATUS: NO TOKENS AVAILABLE
				{:else}
					YOU HAVE {data.user.tokens}
					{data.user.tokens === 1 ? 'TOKEN' : 'TOKENS'} AVAILABLE TO SPEND.
				{/if}
			</p>
		</div>
	</section>

	{#if items.length > 0}
		<section>
			<div class="mb-6 flex items-center gap-3">
				<span class="text-coffee-400">&gt;&gt;</span>
				<h2 class="text-coffee-700 text-lg font-bold tracking-wider uppercase">Available Items</h2>
				<span class="border-coffee-300 flex-1 border-t-2 border-dashed"></span>
			</div>
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each items as item}
					<ItemCard {item} userTokens={user.tokens} />
				{/each}
			</div>
		</section>
	{:else}
		<section class="retro-panel py-12 text-center">
			<pre class="mb-4 text-4xl">[ EMPTY ]</pre>
			<h2 class="text-coffee-700 mb-2 text-lg font-bold uppercase">No Items Available</h2>
			<p class="text-coffee-500 text-sm">&gt; CHECK BACK LATER FOR NEW STOCK_</p>
		</section>
	{/if}
</div>
