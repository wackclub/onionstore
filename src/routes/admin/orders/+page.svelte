<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getName } from 'country-list';
	import { formatDate } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	let orders = $state(data.orders);
	const filters = data.filters ?? {};
	const filterOptions = data.filterOptions ?? {
		customers: [],
		items: [],
		countries: [],
		priceRange: { min: 0, max: 1000 }
	};

	let statusFilter = $state(filters?.status ?? 'all');
	let customerFilter = $state(filters?.customer ?? '');
	let itemFilter = $state(filters?.item ?? '');
	let typeFilter = $state(filters?.type ?? 'all');
	let countryFilter = $state(filters?.country ?? 'all');
	let startDate = $state(filters?.startDate ?? '');
	let endDate = $state(filters?.endDate ?? '');
	let minPrice = $state(filters?.minPrice ?? '');
	let maxPrice = $state(filters?.maxPrice ?? '');
	let sortBy = $state(filters?.sortBy ?? 'createdAt');
	let sortOrder = $state(filters?.sortOrder ?? 'desc');

	let showFilters = $state(false);
	let customerComboboxOpen = $state(false);
	let customerSearchTerm = $state('');
	let customerComboboxRef = $state<HTMLDivElement>();
	let customerInputRef = $state<HTMLInputElement>();

	let updatingOrders = $state(new Set<string>());
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');
	let showToast = $state(false);

	let showMemoModal = $state(false);
	let memoText = $state('');
	let memoOrderId = $state('');
	let memoStatus = $state<'fulfilled' | 'rejected'>('fulfilled');

	const filteredCustomers = $derived(() => {
		if (!customerSearchTerm) return filterOptions.customers.filter(Boolean);
		return filterOptions.customers.filter(
			(customer) => customer && customer.toLowerCase().includes(customerSearchTerm.toLowerCase())
		);
	});

	const currentFilteredCustomers = $derived(filteredCustomers());

	function showToastNotification(message: string, type: 'success' | 'error' = 'success') {
		toastMessage = message;
		toastType = type;
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}

	function openMemoModal(orderId: string, status: 'fulfilled' | 'rejected') {
		memoOrderId = orderId;
		memoStatus = status;
		memoText = '';
		showMemoModal = true;
	}

	function closeMemoModal() {
		showMemoModal = false;
		memoText = '';
		memoOrderId = '';
	}

	function handleMemoKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeMemoModal();
	}

	function selectCustomer(customer: string) {
		customerFilter = customer;
		customerSearchTerm = customer;
		customerComboboxOpen = false;
		applyFilters();
	}

	function clearCustomerSearch() {
		customerFilter = '';
		customerSearchTerm = '';
		customerComboboxOpen = false;
		applyFilters();
	}

	function handleCustomerInputFocus() {
		customerComboboxOpen = true;
	}

	function handleCustomerInputBlur() {
		setTimeout(() => {
			customerComboboxOpen = false;
		}, 150);
	}

	function handleCustomerInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			customerComboboxOpen = false;
			customerInputRef?.blur();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			const firstOption = customerComboboxRef?.querySelector('[role="option"]') as HTMLElement;
			firstOption?.focus();
		}
	}

	function handleCustomerOptionKeydown(event: KeyboardEvent, customer: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectCustomer(customer);
		} else if (event.key === 'Escape') {
			customerComboboxOpen = false;
			customerInputRef?.focus();
		}
	}

	$effect(() => {
		if (!customerComboboxOpen) {
			customerSearchTerm = customerFilter || '';
		}
	});

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-700 border-2 border-yellow-700';
			case 'fulfilled':
				return 'bg-green-100 text-green-700 border-2 border-green-700';
			case 'rejected':
				return 'bg-red-100 text-red-700 border-2 border-red-700';
			default:
				return 'bg-gray-100 text-gray-700 border-2 border-gray-700';
		}
	}

	function applyFilters() {
		if (!browser) return;

		const params = new URLSearchParams();
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (customerFilter) params.set('customer', customerFilter);
		if (itemFilter) params.set('item', itemFilter);
		if (typeFilter !== 'all') params.set('type', typeFilter);
		if (countryFilter !== 'all') params.set('country', countryFilter);
		if (startDate) params.set('startDate', startDate);
		if (endDate) params.set('endDate', endDate);
		if (minPrice) params.set('minPrice', minPrice);
		if (maxPrice) params.set('maxPrice', maxPrice);
		if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
		if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

		goto(`/admin/orders?${params.toString()}`, { replaceState: true });
	}

	function clearFilters() {
		statusFilter = 'all';
		customerFilter = '';
		customerSearchTerm = '';
		itemFilter = '';
		typeFilter = 'all';
		countryFilter = 'all';
		startDate = '';
		endDate = '';
		minPrice = '';
		maxPrice = '';
		sortBy = 'createdAt';
		sortOrder = 'desc';
		applyFilters();
	}

	function toggleSort(field: string) {
		if (sortBy === field) {
			sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		} else {
			sortBy = field;
			sortOrder = 'desc';
		}
		applyFilters();
	}

	function getSortIcon(field: string) {
		if (sortBy !== field) return '[=]';
		return sortOrder === 'desc' ? '[v]' : '[^]';
	}

	async function updateOrderStatus(orderId: string, newStatus: string, memo?: string) {
		updatingOrders.add(orderId);

		try {
			const response = await fetch('/api/admin/orders', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId, status: newStatus, memo })
			});

			if (response.ok) {
				const orderIndex = orders.findIndex((order) => order.id === orderId);
				if (orderIndex !== -1) {
					orders[orderIndex] = {
						...orders[orderIndex],
						status: newStatus as 'pending' | 'fulfilled' | 'rejected',
						memo: memo ?? null
					};
					showToastNotification(
						`ORDER #${orderId.slice(-8)} ${newStatus.toUpperCase()}`,
						'success'
					);
				}
			} else {
				showToastNotification('ERROR: UPDATE FAILED', 'error');
			}
		} catch {
			showToastNotification('ERROR: NETWORK FAILURE', 'error');
		} finally {
			updatingOrders.delete(orderId);
		}
	}

	async function submitMemo() {
		if (!memoText.trim()) {
			showToastNotification('ERROR: MEMO REQUIRED', 'error');
			return;
		}
		await updateOrderStatus(memoOrderId, memoStatus, memoText.trim());
		closeMemoModal();
	}

	const activeFiltersCount = $derived(
		[
			statusFilter !== 'all' ? 1 : 0,
			customerFilter ? 1 : 0,
			itemFilter ? 1 : 0,
			typeFilter !== 'all' ? 1 : 0,
			countryFilter !== 'all' ? 1 : 0,
			startDate ? 1 : 0,
			endDate ? 1 : 0,
			minPrice ? 1 : 0,
			maxPrice ? 1 : 0
		].reduce((a, b) => a + b, 0)
	);

	$effect(() => {
		orders = data.orders;
	});

	function getCountryDisplay(code: string | null): string {
		if (!code) return 'N/A';
		if (code === 'GB') return 'UK';
		if (code === 'US') return 'US';
		return getName(code) || code;
	}
</script>

<div class="flex flex-col gap-6">
	<section class="retro-panel">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<pre class="text-coffee-500 mb-2 text-xs">&gt; ORDER MANAGEMENT SYSTEM</pre>
				<h1 class="retro-title text-2xl">Order Control</h1>
				<p class="retro-subtitle mt-1">
					&gt; {orders.length}
					{orders.length === 1 ? 'ORDER' : 'ORDERS'} IN DATABASE
				</p>
			</div>
			<a href="/admin" class="retro-btn-secondary">[BACK]</a>
		</div>
	</section>

	<section class="retro-panel-tight">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex flex-wrap items-center gap-2">
				{#each ['all', 'pending', 'fulfilled', 'rejected'] as status}
					<button
						onclick={() => {
							statusFilter = status;
							applyFilters();
						}}
						class="border-2 px-3 py-1 text-xs font-bold uppercase transition-colors duration-100
							{statusFilter === status
							? status === 'pending'
								? 'border-yellow-700 bg-yellow-100 text-yellow-700'
								: status === 'fulfilled'
									? 'border-green-700 bg-green-100 text-green-700'
									: status === 'rejected'
										? 'border-red-700 bg-red-100 text-red-700'
										: 'bg-coffee-600 text-cream-50 border-coffee-800'
							: 'bg-cream-100 text-coffee-600 border-coffee-400 hover:border-coffee-600'}"
					>
						[{status.toUpperCase()}]
					</button>
				{/each}
			</div>

			<div class="flex items-center gap-2">
				<button onclick={() => (showFilters = !showFilters)} class="retro-btn text-xs">
					[FILTERS{#if activeFiltersCount > 0}: {activeFiltersCount}{/if}]
				</button>
				{#if activeFiltersCount > 0}
					<button onclick={clearFilters} class="retro-btn-secondary text-xs">[CLEAR]</button>
				{/if}
			</div>
		</div>

		{#if showFilters}
			<hr class="retro-divider" />
			<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div class="relative">
					<label for="customer-filter" class="retro-label">&gt; Customer</label>
					<div class="relative" bind:this={customerComboboxRef}>
						<input
							id="customer-filter"
							bind:this={customerInputRef}
							bind:value={customerSearchTerm}
							onfocus={handleCustomerInputFocus}
							onblur={handleCustomerInputBlur}
							onkeydown={handleCustomerInputKeydown}
							oninput={() => (customerComboboxOpen = true)}
							placeholder="SEARCH..."
							role="combobox"
							aria-expanded={customerComboboxOpen}
							aria-haspopup="listbox"
							aria-controls="customer-listbox"
							class="retro-input text-xs"
						/>
						{#if customerComboboxOpen && currentFilteredCustomers.length > 0}
							<div
								id="customer-listbox"
								class="border-coffee-600 bg-cream-50 absolute z-10 mt-1 max-h-40 w-full overflow-auto border-2"
								role="listbox"
							>
								{#each currentFilteredCustomers as customer}
									{#if customer}
										<button
											role="option"
											aria-selected={customerFilter === customer}
											onclick={() => selectCustomer(customer)}
											onkeydown={(e) => handleCustomerOptionKeydown(e, customer)}
											class="hover:bg-cream-200 w-full px-3 py-2 text-left text-xs font-bold {customerFilter ===
											customer
												? 'bg-cream-200 text-coffee-800'
												: 'text-coffee-600'}"
										>
											{customer}
										</button>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div>
					<label for="item-filter" class="retro-label">&gt; Item</label>
					<select
						id="item-filter"
						bind:value={itemFilter}
						onchange={applyFilters}
						class="retro-input text-xs"
					>
						<option value="">-- ALL ITEMS --</option>
						{#each filterOptions?.items ?? [] as item}
							{#if item}
								<option value={item}>{item.toUpperCase()}</option>
							{/if}
						{/each}
					</select>
				</div>

				<div>
					<label for="country-filter" class="retro-label">&gt; Country</label>
					<select
						id="country-filter"
						bind:value={countryFilter}
						onchange={applyFilters}
						class="retro-input text-xs"
					>
						<option value="all">-- ALL --</option>
						{#each filterOptions?.countries ?? [] as countryCode}
							<option value={countryCode}>{getCountryDisplay(countryCode)}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="start-date" class="retro-label">&gt; Start Date</label>
					<input
						id="start-date"
						type="date"
						bind:value={startDate}
						onchange={applyFilters}
						class="retro-input text-xs"
					/>
				</div>

				<div>
					<label for="end-date" class="retro-label">&gt; End Date</label>
					<input
						id="end-date"
						type="date"
						bind:value={endDate}
						onchange={applyFilters}
						class="retro-input text-xs"
					/>
				</div>

				<div>
					<label for="min-price" class="retro-label">&gt; Min Price</label>
					<input
						id="min-price"
						type="number"
						bind:value={minPrice}
						onchange={applyFilters}
						placeholder="0"
						min="0"
						class="retro-input text-xs"
					/>
				</div>

				<div>
					<label for="max-price" class="retro-label">&gt; Max Price</label>
					<input
						id="max-price"
						type="number"
						bind:value={maxPrice}
						onchange={applyFilters}
						placeholder="999"
						min="0"
						class="retro-input text-xs"
					/>
				</div>
			</div>
		{/if}
	</section>

	<section class="retro-panel-tight overflow-hidden !p-0">
		{#if orders.length === 0}
			<div class="py-12 text-center">
				<pre class="text-coffee-400 mb-4 text-4xl">[ NO DATA ]</pre>
				<h3 class="text-coffee-700 mb-2 text-lg font-bold uppercase">
					{activeFiltersCount > 0 ? 'No Matching Orders' : 'No Orders Yet'}
				</h3>
				<p class="text-coffee-500 mb-6 text-xs">
					{activeFiltersCount > 0 ? '> ADJUST FILTERS TO SEE RESULTS' : '> ORDERS WILL APPEAR HERE'}
				</p>
				{#if activeFiltersCount > 0}
					<button onclick={clearFilters} class="retro-btn">[CLEAR FILTERS]</button>
				{/if}
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full">
					<thead>
						<tr class="border-coffee-700 bg-cream-200 border-b-2">
							<th
								class="text-coffee-700 px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								>ID</th
							>
							<th
								class="text-coffee-700 hover:text-coffee-900 cursor-pointer px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								onclick={() => toggleSort('customer')}
							>
								Customer {getSortIcon('customer')}
							</th>
							<th
								class="text-coffee-700 px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								>Country</th
							>
							<th
								class="text-coffee-700 hover:text-coffee-900 cursor-pointer px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								onclick={() => toggleSort('item')}
							>
								Item {getSortIcon('item')}
							</th>
							<th
								class="text-coffee-700 hover:text-coffee-900 cursor-pointer px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								onclick={() => toggleSort('price')}
							>
								Price {getSortIcon('price')}
							</th>
							<th
								class="text-coffee-700 hover:text-coffee-900 cursor-pointer px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								onclick={() => toggleSort('status')}
							>
								Status {getSortIcon('status')}
							</th>
							<th
								class="text-coffee-700 hover:text-coffee-900 cursor-pointer px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								onclick={() => toggleSort('createdAt')}
							>
								Date {getSortIcon('createdAt')}
							</th>
							<th
								class="text-coffee-700 px-4 py-3 text-left text-xs font-bold tracking-wider uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-coffee-300 divide-y-2">
						{#each orders as order}
							<tr class="hover:bg-cream-100 transition-colors duration-100">
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="text-coffee-700 text-xs font-bold">#{order.id.slice(-8)}</span>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="text-coffee-800 text-xs font-bold uppercase"
										>{order.userDisplayName || order.userEmail}</span
									>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="text-coffee-600 text-xs font-bold"
										>{getCountryDisplay(order.userCountry)}</span
									>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<div class="flex items-center gap-2">
										<div class="border-coffee-600 h-8 w-8 overflow-hidden border-2">
											<img
												src={order.itemImageUrl}
												alt={order.itemName}
												class="h-full w-full object-cover"
											/>
										</div>
										<span class="text-coffee-800 text-xs font-bold uppercase">{order.itemName}</span
										>
									</div>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span class="text-coffee-800 text-xs font-bold">{order.priceAtOrder} TKN</span>
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span
										class="inline-flex px-2 py-1 text-xs font-bold uppercase {getStatusColor(
											order.status
										)}"
									>
										[{order.status}]
									</span>
								</td>
								<td class="text-coffee-600 px-4 py-3 text-xs font-bold whitespace-nowrap"
									>{formatDate(order.createdAt)}</td
								>
								<td class="px-4 py-3 whitespace-nowrap">
									{#if order.status === 'pending'}
										<div class="flex gap-1">
											<button
												onclick={() => openMemoModal(order.id, 'fulfilled')}
												disabled={updatingOrders.has(order.id)}
												class="border-2 border-green-700 bg-green-100 px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-200 disabled:opacity-50"
											>
												[OK]
											</button>
											<button
												onclick={() => openMemoModal(order.id, 'rejected')}
												disabled={updatingOrders.has(order.id)}
												class="border-2 border-red-700 bg-red-100 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
											>
												[X]
											</button>
										</div>
									{:else}
										<span class="text-coffee-400 text-xs">--</span>
									{/if}
								</td>
							</tr>
							{#if order.memo}
								<tr class="bg-cream-100">
									<td colspan="8" class="px-4 py-2">
										<div class="text-coffee-600 text-xs">
											<span class="text-coffee-700 font-bold">&gt; NOTE:</span>
											{order.memo}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<div class="retro-panel-tight flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center border-2 border-yellow-700 bg-yellow-100 text-sm font-bold text-yellow-700"
			>
				[P]
			</div>
			<div>
				<div class="text-coffee-800 text-xl font-bold">
					{orders.filter((o) => o.status === 'pending').length}
				</div>
				<div class="text-coffee-500 text-xs font-bold uppercase">Pending</div>
			</div>
		</div>
		<div class="retro-panel-tight flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center border-2 border-green-700 bg-green-100 text-sm font-bold text-green-700"
			>
				[F]
			</div>
			<div>
				<div class="text-xl font-bold text-green-700">
					{orders.filter((o) => o.status === 'fulfilled').length}
				</div>
				<div class="text-coffee-500 text-xs font-bold uppercase">Fulfilled</div>
			</div>
		</div>
		<div class="retro-panel-tight flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center border-2 border-red-700 bg-red-100 text-sm font-bold text-red-700"
			>
				[R]
			</div>
			<div>
				<div class="text-xl font-bold text-red-700">
					{orders.filter((o) => o.status === 'rejected').length}
				</div>
				<div class="text-coffee-500 text-xs font-bold uppercase">Rejected</div>
			</div>
		</div>
		<div class="retro-panel-tight flex items-center gap-3">
			<div
				class="border-coffee-700 bg-caramel text-coffee-900 flex h-10 w-10 items-center justify-center border-2 text-sm font-bold"
			>
				[$]
			</div>
			<div>
				<div class="text-coffee-800 text-xl font-bold">
					{orders
						.filter((o) => o.status === 'fulfilled')
						.reduce((sum, o) => sum + o.priceAtOrder, 0)}
				</div>
				<div class="text-coffee-500 text-xs font-bold uppercase">Revenue</div>
			</div>
		</div>
	</section>
</div>

{#if showMemoModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
	>
		<button
			class="bg-coffee-900/70 fixed inset-0 cursor-default"
			onclick={closeMemoModal}
			aria-label="Close modal"
		></button>
		<div class="retro-panel relative w-full max-w-md">
			<div class="mb-4">
				<h3 class="text-coffee-800 text-lg font-bold uppercase">
					{memoStatus === 'fulfilled' ? '> FULFILL ORDER' : '> REJECT ORDER'}
				</h3>
				<p class="text-coffee-600 mt-1 text-xs">&gt; ADD NOTE FOR CUSTOMER</p>
			</div>
			<hr class="retro-divider" />
			<div class="my-4">
				<label for="memo-input" class="retro-label">&gt; Memo</label>
				<textarea
					id="memo-input"
					bind:value={memoText}
					onkeydown={handleMemoKeydown}
					placeholder="ENTER NOTE..."
					rows="4"
					class="retro-input resize-none text-xs"
				></textarea>
			</div>
			<div class="flex justify-end gap-2">
				<button onclick={closeMemoModal} class="retro-btn-secondary text-xs">[CANCEL]</button>
				<button
					onclick={submitMemo}
					disabled={!memoText.trim() || updatingOrders.has(memoOrderId)}
					class="border-2 px-4 py-2 text-xs font-bold {memoStatus === 'fulfilled'
						? 'border-green-700 bg-green-100 text-green-700 hover:bg-green-200'
						: 'border-red-700 bg-red-100 text-red-700 hover:bg-red-200'} disabled:opacity-50"
				>
					[{memoStatus === 'fulfilled' ? 'FULFILL' : 'REJECT'}]
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showToast}
	<div class="fixed right-4 bottom-4 z-50">
		<div
			class="border-2 px-4 py-3 {toastType === 'success'
				? 'border-green-700 bg-green-100 text-green-700'
				: 'border-red-700 bg-red-100 text-red-700'}"
		>
			<div class="flex items-center gap-2 text-xs font-bold">
				<span>&gt; {toastMessage}</span>
				<button onclick={() => (showToast = false)} class="hover:opacity-70" aria-label="Close"
					>[X]</button
				>
			</div>
		</div>
	</div>
{/if}
