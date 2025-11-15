<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { getName } from 'country-list';

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
	let yswsDbFilter = $state(filters?.yswsDb ?? 'all');
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
	const filteredAndSortedOrders = $derived(() => {
		return orders;
	});

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
		if (event.key === 'Escape') {
			closeMemoModal();
		}
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

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDateForInput(date: Date | string) {
		return new Date(date).toISOString().split('T')[0];
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'fulfilled':
				return 'bg-green-100 text-green-800';
			case 'rejected':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
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
		if (yswsDbFilter !== 'all') params.set('yswsDb', yswsDbFilter);
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
		yswsDbFilter = 'all';
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
		if (sortBy !== field) return '↕️';
		return sortOrder === 'desc' ? '↓' : '↑';
	}

	async function updateOrderStatus(orderId: string, newStatus: string, memo?: string) {
		updatingOrders.add(orderId);

		try {
			const response = await fetch('/api/admin/orders', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ orderId, status: newStatus, memo })
			});

			if (response.ok) {
				const orderIndex = orders.findIndex((order) => order.id === orderId);
				if (orderIndex !== -1) {
					orders[orderIndex] = { ...orders[orderIndex], status: newStatus as any, memo };
					showToastNotification(`Order #${orderId.slice(-8)} has been ${newStatus}`, 'success');
				}
			} else {
				showToastNotification('Failed to update order status', 'error');
			}
		} catch (error) {
			showToastNotification('Network error. Please try again.', 'error');
		} finally {
			updatingOrders.delete(orderId);
		}
	}

	async function submitMemo() {
		if (!memoText.trim()) {
			showToastNotification('Please enter a memo', 'error');
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
			yswsDbFilter !== 'all' ? 1 : 0,
			startDate ? 1 : 0,
			endDate ? 1 : 0,
			minPrice ? 1 : 0,
			maxPrice ? 1 : 0
		].reduce((a, b) => a + b, 0)
	);

	$effect(() => {
		orders = data.orders;
	});
</script>

<div class="mx-auto max-w-7xl space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-semibold">Order Management</h1>
			<p class="mt-1 text-gray-600">
				View and manage all customer orders
				{#if orders.length > 0}
					({orders.length} {orders.length === 1 ? 'order' : 'orders'})
				{/if}
			</p>
		</div>
		<a href="/admin" class="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
			Back to Dashboard
		</a>
	</div>

	<!-- Filters and Controls -->
	<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex flex-wrap items-center gap-4">
				<!-- Quick Status Filters -->
				<div class="flex items-center space-x-2">
					<button
						onclick={() => {
							statusFilter = 'all';
							applyFilters();
						}}
						class="rounded px-3 py-1 text-sm font-medium transition-colors
							{statusFilter === 'all'
							? 'bg-blue-100 text-blue-700'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						All
					</button>
					<button
						onclick={() => {
							statusFilter = 'pending';
							applyFilters();
						}}
						class="rounded px-3 py-1 text-sm font-medium transition-colors
							{statusFilter === 'pending'
							? 'bg-yellow-100 text-yellow-700'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						Pending
					</button>
					<button
						onclick={() => {
							statusFilter = 'fulfilled';
							applyFilters();
						}}
						class="rounded px-3 py-1 text-sm font-medium transition-colors
							{statusFilter === 'fulfilled'
							? 'bg-green-100 text-green-700'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						Fulfilled
					</button>
					<button
						onclick={() => {
							statusFilter = 'rejected';
							applyFilters();
						}}
						class="rounded px-3 py-1 text-sm font-medium transition-colors
							{statusFilter === 'rejected'
							? 'bg-red-100 text-red-700'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						Rejected
					</button>
				</div>

				<!-- Quick Type Filters -->
				<div class="flex items-center space-x-2">
					<button
						onclick={() => {
							typeFilter = 'all';
							applyFilters();
						}}
						class="rounded px-3 py-1 text-sm font-medium transition-colors
							{typeFilter === 'all'
							? 'bg-purple-100 text-purple-700'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						All Items
					</button>
					<button
						onclick={() => {
							typeFilter = 'hcb';
							applyFilters();
						}}
						class="rounded px-3 py-1 text-sm font-medium transition-colors
							{typeFilter === 'hcb'
							? 'bg-orange-100 text-orange-700'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						HCB Items
					</button>
					<button
						onclick={() => {
							typeFilter = 'third_party';
							applyFilters();
						}}
						class="rounded px-3 py-1 text-sm font-medium transition-colors
							{typeFilter === 'third_party'
							? 'bg-teal-100 text-teal-700'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						Third Party
					</button>
				</div>

				<!-- Quick Sort -->
				<div class="flex items-center space-x-2">
					<span class="text-sm text-gray-500">Sort:</span>
					<select
						bind:value={sortBy}
						onchange={applyFilters}
						class="rounded border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="createdAt">Date</option>
						<option value="price">Price</option>
						<option value="status">Status</option>
						<option value="customer">Customer</option>
						<option value="item">Item</option>
					</select>
					<button
						onclick={() => toggleSort(sortBy)}
						class="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
						title="Toggle sort order"
					>
						{getSortIcon(sortBy)}
					</button>
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<button
					onclick={() => (showFilters = !showFilters)}
					class="flex items-center space-x-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
				>
					<span>Advanced Filters</span>
					{#if activeFiltersCount > 0}
						<span class="rounded-full bg-blue-400 px-2 py-0.5 text-xs">
							{activeFiltersCount}
						</span>
					{/if}
				</button>
				{#if activeFiltersCount > 0}
					<button
						onclick={clearFilters}
						class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
					>
						Clear All
					</button>
				{/if}
			</div>
		</div>

		<!-- Advanced Filters Panel -->
		{#if showFilters}
			<div class="mt-4 grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Customer Filter -->
				<div class="relative">
					<label for="customer-filter" class="mb-1 block text-sm font-medium text-gray-700"
						>Customer</label
					>
					<div class="relative" bind:this={customerComboboxRef}>
						<input
							id="customer-filter"
							bind:this={customerInputRef}
							bind:value={customerSearchTerm}
							onfocus={handleCustomerInputFocus}
							onblur={handleCustomerInputBlur}
							onkeydown={handleCustomerInputKeydown}
							oninput={() => {
								customerComboboxOpen = true;
							}}
							placeholder="Search customers..."
							role="combobox"
							aria-expanded={customerComboboxOpen}
							aria-haspopup="listbox"
							aria-controls="customer-listbox"
							aria-label="Search and select customer"
							class="w-full rounded border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:outline-none"
						/>
						<div class="absolute inset-y-0 right-0 flex items-center pr-2">
							{#if customerSearchTerm || customerFilter}
								<button
									onclick={clearCustomerSearch}
									class="text-gray-400 hover:text-gray-600"
									aria-label="Clear customer search"
									type="button"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										></path>
									</svg>
								</button>
							{:else}
								<svg
									class="h-4 w-4 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									></path>
								</svg>
							{/if}
						</div>

						{#if customerComboboxOpen && currentFilteredCustomers.length > 0}
							<div
								id="customer-listbox"
								class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
								role="listbox"
								aria-label="Customer options"
							>
								{#each currentFilteredCustomers as customer (customer)}
									{#if customer}
										<button
											onclick={() => selectCustomer(customer)}
											onkeydown={(e) => handleCustomerOptionKeydown(e, customer)}
											type="button"
											role="option"
											aria-selected={customerFilter === customer}
											tabindex="0"
											class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
												{customerFilter === customer ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}"
										>
											{customer}
										</button>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Item Filter -->
				<div>
					<label for="item-filter" class="mb-1 block text-sm font-medium text-gray-700">Item</label>
					<select
						id="item-filter"
						bind:value={itemFilter}
						onchange={applyFilters}
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="">All items</option>
						{#each filterOptions?.items ?? [] as item}
							<option value={item}>{item}</option>
						{/each}
					</select>
				</div>

				<!-- Country Filter -->
				<div>
					<label for="country-filter" class="mb-1 block text-sm font-medium text-gray-700"
						>Country</label
					>
					<select
						id="country-filter"
						bind:value={countryFilter}
						onchange={applyFilters}
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="all">All countries</option>
						{#each filterOptions?.countries ?? [] as countryCode}
							<option value={countryCode}>
								{countryCode === 'GB'
									? 'UK'
									: countryCode === 'US'
										? 'US'
										: getName(countryCode) || countryCode} ({countryCode})
							</option>
						{/each}
					</select>
				</div>

				<!-- YSWS DB Status Filter -->
				<div>
					<label for="ysws-filter" class="mb-1 block text-sm font-medium text-gray-700"
						>YSWS DB Status</label
					>
					<select
						id="ysws-filter"
						bind:value={yswsDbFilter}
						onchange={applyFilters}
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					>
						<option value="all">All users</option>
						<option value="true">YSWS DB fulfilled</option>
						<option value="false">Not YSWS DB fulfilled</option>
					</select>
				</div>

				<!-- Date Range -->
				<div>
					<label for="start-date" class="mb-1 block text-sm font-medium text-gray-700"
						>Start Date</label
					>
					<input
						id="start-date"
						type="date"
						bind:value={startDate}
						onchange={applyFilters}
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="end-date" class="mb-1 block text-sm font-medium text-gray-700">End Date</label
					>
					<input
						id="end-date"
						type="date"
						bind:value={endDate}
						onchange={applyFilters}
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					/>
				</div>

				<!-- Price Range -->
				<div>
					<label for="min-price" class="mb-1 block text-sm font-medium text-gray-700"
						>Min Price</label
					>
					<input
						id="min-price"
						type="number"
						bind:value={minPrice}
						onchange={applyFilters}
						placeholder="Min tokens"
						min="0"
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<label for="max-price" class="mb-1 block text-sm font-medium text-gray-700"
						>Max Price</label
					>
					<input
						id="max-price"
						type="number"
						bind:value={maxPrice}
						onchange={applyFilters}
						placeholder="Max tokens"
						min="0"
						class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- Orders Table -->
	<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
		{#if orders.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl text-gray-400">📦</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">
					{activeFiltersCount > 0 ? 'No orders match your filters' : 'No orders yet'}
				</h3>
				<p class="text-gray-500">
					{activeFiltersCount > 0
						? 'Try adjusting your filters to see more results.'
						: 'Orders will appear here once customers start purchasing items.'}
				</p>
				{#if activeFiltersCount > 0}
					<button
						onclick={clearFilters}
						class="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Clear Filters
					</button>
				{/if}
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Order
							</th>
							<th
								class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								onclick={() => toggleSort('customer')}
							>
								<div class="flex items-center space-x-1">
									<span>Customer</span>
									<span class="text-gray-400">{getSortIcon('customer')}</span>
								</div>
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Country / YSWS
							</th>
							<th
								class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								onclick={() => toggleSort('item')}
							>
								<div class="flex items-center space-x-1">
									<span>Item</span>
									<span class="text-gray-400">{getSortIcon('item')}</span>
								</div>
							</th>
							<th
								class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								onclick={() => toggleSort('price')}
							>
								<div class="flex items-center space-x-1">
									<span>Price</span>
									<span class="text-gray-400">{getSortIcon('price')}</span>
								</div>
							</th>
							<th
								class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								onclick={() => toggleSort('status')}
							>
								<div class="flex items-center space-x-1">
									<span>Status</span>
									<span class="text-gray-400">{getSortIcon('status')}</span>
								</div>
							</th>
							<th
								class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								onclick={() => toggleSort('createdAt')}
							>
								<div class="flex items-center space-x-1">
									<span>Date</span>
									<span class="text-gray-400">{getSortIcon('createdAt')}</span>
								</div>
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each orders as order}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										#{order.id.slice(-8)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<img
											src={order.userAvatarUrl}
											alt="User avatar"
											class="mr-3 h-8 w-8 rounded-full"
										/>
										<div class="text-sm text-gray-900">
											{order.userDisplayName || order.userSlackId}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm">
										{#if order.userCountry}
											<div class="font-medium text-gray-900">
												{order.userCountry === 'GB'
													? 'UK'
													: order.userCountry === 'US'
														? 'US'
														: getName(order.userCountry) || order.userCountry} ({order.userCountry})
											</div>
										{:else}
											<div class="text-gray-400 italic">No country</div>
										{/if}
										<div
											class="text-xs {order.userYswsDbFulfilled
												? 'text-green-600'
												: 'text-gray-400'}"
										>
											{order.userYswsDbFulfilled ? '✓ YSWS DB' : '○ No YSWS DB'}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<img
											src={order.itemImageUrl}
											alt={order.itemName}
											class="mr-3 h-10 w-10 rounded-md object-cover"
										/>
										<div class="text-sm text-gray-900">
											{order.itemName}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										{order.priceAtOrder} tokens
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getStatusColor(
											order.status
										)}"
									>
										{order.status}
									</span>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									{formatDate(order.createdAt)}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap">
									{#if order.status === 'pending'}
										<div class="flex space-x-2">
											<button
												onclick={() => openMemoModal(order.id, 'fulfilled')}
												disabled={updatingOrders.has(order.id)}
												class="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
											>
												{#if updatingOrders.has(order.id)}
													<span
														class="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-b-2 border-white"
													></span>
												{/if}
												Fulfill
											</button>
											<button
												onclick={() => openMemoModal(order.id, 'rejected')}
												disabled={updatingOrders.has(order.id)}
												class="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
											>
												{#if updatingOrders.has(order.id)}
													<span
														class="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-b-2 border-white"
													></span>
												{/if}
												Reject
											</button>
										</div>
									{:else}
										<span class="text-xs text-gray-400">No actions</span>
									{/if}
								</td>
							</tr>
							{#if order.memo}
								<tr class="hover:bg-gray-50">
									<td colspan="7" class="bg-gray-50 px-6 py-2">
										<div class="text-sm text-gray-600 italic">
											<span class="font-medium text-gray-700">Note:</span>
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
	</div>

	<!-- Enhanced Statistics -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center">
				<div class="text-2xl">📦</div>
				<div class="ml-4">
					<div class="text-2xl font-semibold text-gray-900">
						{orders.filter((o) => o.status === 'pending').length}
					</div>
					<div class="text-sm text-gray-500">Pending Orders</div>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center">
				<div class="text-2xl">✅</div>
				<div class="ml-4">
					<div class="text-2xl font-semibold text-green-600">
						{orders.filter((o) => o.status === 'fulfilled').length}
					</div>
					<div class="text-sm text-gray-500">Fulfilled Orders</div>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center">
				<div class="text-2xl">❌</div>
				<div class="ml-4">
					<div class="text-2xl font-semibold text-red-600">
						{orders.filter((o) => o.status === 'rejected').length}
					</div>
					<div class="text-sm text-gray-500">Rejected Orders</div>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center">
				<div class="text-2xl">💰</div>
				<div class="ml-4">
					<div class="text-2xl font-semibold text-blue-600">
						{orders
							.filter((o) => o.status === 'fulfilled')
							.reduce((sum, order) => sum + order.priceAtOrder, 0)}
					</div>
					<div class="text-sm text-gray-500">Total Revenue (Tokens)</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Memo Modal -->
{#if showMemoModal}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="memo-modal-title"
	>
		<div class="flex min-h-screen items-center justify-center p-4">
			<!-- Backdrop -->
			<div
				class="bg-opacity-50 fixed inset-0 bg-black transition-opacity"
				onclick={closeMemoModal}
			></div>

			<!-- Modal -->
			<div
				class="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white px-6 py-6 shadow-xl transition-all"
			>
				<div class="mb-4">
					<h3 id="memo-modal-title" class="text-lg font-medium text-gray-900">
						{memoStatus === 'fulfilled' ? 'Fulfill Order' : 'Reject Order'}
					</h3>
					<p class="mt-1 text-sm text-gray-500">
						Add a note that will be visible to the customer regarding this order.
					</p>
				</div>

				<div class="mb-4">
					<label for="memo-input" class="mb-2 block text-sm font-medium text-gray-700">
						Memo
					</label>
					<textarea
						id="memo-input"
						bind:value={memoText}
						onkeydown={handleMemoKeydown}
						placeholder="Enter a note about this order decision..."
						rows="4"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						autofocus
					></textarea>
				</div>

				<div class="flex justify-end space-x-3">
					<button
						onclick={closeMemoModal}
						class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						Cancel
					</button>
					<button
						onclick={submitMemo}
						disabled={!memoText.trim() || updatingOrders.has(memoOrderId)}
						class="rounded-md px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50
							{memoStatus === 'fulfilled'
							? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
							: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}"
					>
						{#if updatingOrders.has(memoOrderId)}
							<span
								class="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-b-2 border-white"
							></span>
						{/if}
						{memoStatus === 'fulfilled' ? 'Fulfill Order' : 'Reject Order'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Notification -->
{#if showToast}
	<div class="fixed right-4 bottom-4 z-50 transform transition-all duration-300 ease-in-out">
		<div
			class="rounded-lg px-4 py-3 shadow-lg {toastType === 'success'
				? 'bg-green-600 text-white'
				: 'bg-red-600 text-white'}"
		>
			<div class="flex items-center space-x-2">
				{#if toastType === 'success'}
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
						></path>
					</svg>
				{:else}
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				{/if}
				<span class="text-sm font-medium">{toastMessage}</span>
				<button
					onclick={() => (showToast = false)}
					aria-label="Close notification"
					class="ml-2 text-white hover:text-gray-200"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}
