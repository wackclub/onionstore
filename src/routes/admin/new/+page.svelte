<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import { toast } from 'svelte-sonner';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let imageUrl = $state('');
	let isUploading = $state(false);
	let isDragging = $state(false);
	let fileInputEl: HTMLInputElement;
	let selectedType = $state('');

	$effect(() => {
		if (form?.success) {
			imageUrl = '';
			toast.success('Item created successfully!', {
				duration: 3000
			});
		}
		if (form?.error) {
			toast.error(`Error: ${form.error}`, {
				duration: 5000
			});
		}
	});

	async function uploadFile(file: File) {
		if (!file.type.startsWith('image/')) {
			toast.error('Only image files are allowed');
			return;
		}

		if (file.size > 4 * 1024 * 1024) {
			toast.error('File size must be under 4MB');
			return;
		}

		isUploading = true;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('https://cdn.hackclub.com/api/file', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer beans'
				},
				body: formData
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.statusText}`);
			}

			const data = await response.json();
			imageUrl = data.url;
			toast.success('Image uploaded successfully');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Upload failed');
		} finally {
			isUploading = false;
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) uploadFile(file);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) uploadFile(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}
</script>

<div class="mx-auto w-full max-w-2xl">
	<section class="retro-panel">
		<div class="mb-6">
			<pre class="text-coffee-500 mb-2">ITEM CREATION MODULE</pre>
			<h1 class="retro-title text-2xl">Add New Item</h1>
			<p class="retro-subtitle mt-1">FILL ALL REQUIRED FIELDS</p>
		</div>

		<hr class="retro-divider" />

		<form method="POST" use:enhance class="mt-6 space-y-5">
			<div>
				<label for="name" class="retro-label">Item Name</label>
				<input
					type="text"
					id="name"
					name="name"
					value={form && 'name' in form ? form.name || '' : ''}
					required
					class="retro-input"
					placeholder="ENTER ITEM NAME"
				/>
			</div>

			<div>
				<label for="description" class="retro-label">Description</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					required
					class="retro-input resize-none"
					placeholder="ENTER ITEM DESCRIPTION"
					>{form && 'description' in form ? form.description || '' : ''}</textarea
				>
			</div>

			<div>
				<label for="imageUrl" class="retro-label">Image Upload</label>
				{#if imageUrl}
					<div class="border-coffee-600 mb-4 inline-block border-2">
						<img src={imageUrl} alt="Uploaded content" class="w-48" />
					</div>
				{/if}
				<button
					type="button"
					onclick={() => fileInputEl.click()}
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					disabled={isUploading}
					class="border-coffee-400 bg-cream-100 hover:bg-cream-200 flex w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors {isDragging
						? 'border-coffee-600 bg-cream-200'
						: ''}"
				>
					{#if isUploading}
						<span class="text-coffee-500 text-sm font-bold tracking-wider uppercase"
							>UPLOADING...</span
						>
					{:else}
						<span class="text-coffee-600 text-sm font-bold tracking-wider uppercase"
							>DROP IMAGE HERE OR CLICK TO UPLOAD</span
						>
						<span class="text-coffee-400 mt-1 text-xs">MAX 4MB - IMAGES ONLY</span>
					{/if}
				</button>
				<input
					bind:this={fileInputEl}
					type="file"
					accept="image/*"
					onchange={handleFileSelect}
					class="hidden"
				/>
				<input type="hidden" name="imageUrl" value={imageUrl} />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="price" class="retro-label">Price (Tokens)</label>
					<input
						type="number"
						id="price"
						name="price"
						min="1"
						value={form && 'price' in form ? form.price || '' : ''}
						required
						class="retro-input"
						placeholder="0"
					/>
				</div>

				<div>
					<label for="usd-cost" class="retro-label">USD Cost</label>
					<input
						type="number"
						id="usd-cost"
						name="usd-cost"
						min="1"
						value={form && 'usdCost' in form ? form.usdCost || '' : ''}
						required
						class="retro-input"
						placeholder="0"
					/>
				</div>
			</div>

			<div>
				<label for="type" class="retro-label">Item Type</label>
				<select id="type" name="type" required class="retro-input" bind:value={selectedType}>
					<option value="">Select Type</option>
					<option value="hcb">HCB</option>
					<option value="third_party">Third Party</option>
				</select>
			</div>

			{#if selectedType === 'hcb'}
				<div>
					<label for="hcbMids" class="retro-label">HCB MIDs (Optional)</label>
					<input
						type="text"
						id="hcbMids"
						name="hcbMids"
						value={form && 'hcbMids' in form ? form.hcbMids || '' : ''}
						placeholder="mid1, mid2, mid3"
						class="retro-input"
					/>
				</div>

				<div>
					<label for="hcbMids" class="retro-label">HCB Category Locks (Optional)</label>
					<input
						type="text"
						id="hcbCategoryLock"
						name="hcbCategoryLock"
						value={form && 'hcbCategoryLock' in form ? form.hcbCategoryLock || '' : ''}
						placeholder="grocery_stores_supermarkets,fast_food_restaurants"
						class="retro-input"
					/>
				</div>

				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						id="hcbIsPreauth"
						name="hcbIsPreauth"
						class="retro-checkbox h-5 w-5"
					/>
					<label for="hcbIsPreauth" class="retro-label mb-0">HCB Pre-Authorization</label>
				</div>

				<div>
					<label for="hcbPurpose" class="retro-label">HCB Purpose (Optional)</label>
					<textarea
						id="hcbPurpose"
						name="hcbPurpose"
						rows="2"
						class="retro-input resize-none"
						placeholder="ENTER HCB PURPOSE"
						>{form && 'hcbPurpose' in form ? form.hcbPurpose || '' : ''}</textarea
					>
				</div>
			{/if}

			<hr class="retro-divider" />

			<div class="flex gap-3">
				<a href="/admin" class="retro-btn-secondary flex-1 text-center">CANCEL</a>
				<button type="submit" disabled={!imageUrl} class="retro-btn flex-1"> CREATE ITEM </button>
			</div>
		</form>
	</section>
</div>
