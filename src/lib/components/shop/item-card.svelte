<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { ShopItem } from '$lib/server/db/schema';
	import confetti from 'canvas-confetti';

	interface Props {
		item: ShopItem;
		userTokens: number;
		index: number;
	}
	const { item, userTokens, index }: Props = $props();

	let isOrdering = $state(false);
	let orderMessage = $state('');
	let availableTokens = $state(userTokens);
	const canAfford = $derived(availableTokens >= item.price);

	$effect(() => {
		availableTokens = userTokens;
	});

	async function handleBuy() {
		if (isOrdering || !canAfford) return;

		isOrdering = true;
		orderMessage = '';

		try {
			const response = await fetch('/api/order', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ shopItemId: item.id })
			});

			const result = await response.json();

			if (response.ok) {
				orderMessage = 'ORDER PLACED!';
				availableTokens = result.remainingTokens ?? availableTokens - item.price;
				confetti({
					particleCount: 100,
					spread: 70,
					origin: { y: 0.6 },
					colors: ['#d4a574', '#c9a87c', '#7d5c3a', '#f5e6d3', '#ffffff']
				});
				await invalidateAll();
			} else {
				orderMessage = result.error || 'ERROR: FAILED';
			}
		} catch (error) {
			orderMessage = 'ERROR: NETWORK';
		} finally {
			isOrdering = false;
		}
	}
</script>

<article class="retro-card flex h-full flex-col">
	<div class="bg-cream-200 border-coffee-700 relative aspect-[4/3] overflow-hidden border-b-2">
		<img
			src={item.imageUrl}
			alt={item.name}
			class="h-full w-full object-cover"
			fetchpriority={index < 3 ? 'high' : null}
		/>
		<div class="absolute top-2 right-2">
			<div class="retro-chip">
				<span class="font-bold">{item.price}</span>
				<span class="text-xs">{item.price === 1 ? 'TKN' : 'TKNS'}</span>
			</div>
		</div>
	</div>
	<div class="flex flex-1 flex-col gap-3 p-4">
		<div class="flex-1">
			<h3 class="text-coffee-800 mb-2 text-base font-bold tracking-wide uppercase">{item.name}</h3>
			<p class="text-coffee-600 leading-relaxed">{item.description}</p>
		</div>
		<hr class="retro-divider" />
		<button
			onclick={handleBuy}
			disabled={isOrdering || !canAfford}
			class="w-full {canAfford ? 'retro-btn' : 'retro-btn-secondary cursor-not-allowed opacity-60'}"
		>
			{#if isOrdering}
				ORDERING
			{:else if !canAfford}
				INSUFFICIENT TOKENS
			{:else}
				PURCHASE
			{/if}
		</button>
		{#if orderMessage}
			<div
				class="border-2 p-2 text-center font-bold {orderMessage.includes('ORDER')
					? 'border-green-700 bg-green-100 text-green-700'
					: 'border-red-700 bg-red-100 text-red-700'}"
			>
				{orderMessage}
			</div>
		{/if}
	</div>
</article>
