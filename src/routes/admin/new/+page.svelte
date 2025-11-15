<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	import { createUploader } from '$lib/utils/uploadthing';
	import { UploadDropzone } from '@uploadthing/svelte';
	import { toast } from 'svelte-sonner';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let imageUrl = $state('');

	$effect(() => {
		if (form?.success) {
			imageUrl = '';
			toast.success('Item created successfully!', {
				duration: 3000,
			});
		}
		if (form?.error) {
			toast.error(`Error: ${form.error}`, {
				duration: 5000,
			});
		}
	})

	const uploader = createUploader('imageUploader', {
		onClientUploadComplete: (res) => {
			imageUrl = res[0].ufsUrl;
		},
		onUploadError: (error: Error) => {
			alert(`ERROR! ${error.message}`);
		}
	});
</script>

<div class="mx-auto w-full md:w-2xl space-y-6">
	<h1 class="text-3xl font-semibold">Add New Item</h1>

	<form method="POST" use:enhance class="space-y-4">
		<div>
			<label for="name" class="block text-sm font-medium">Name</label>
			<input
				type="text"
				id="name"
				name="name"
				value={form && 'name' in form ? form.name || '' : ''}
				required
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<div>
			<label for="description" class="block text-sm font-medium">Description</label>
			<textarea
				id="description"
				name="description"
				rows="3"
				required
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>{form && 'description' in form ? form.description || '' : ''}</textarea
			>
		</div>

		<div>
			<label for="imageUrl" class="block text-sm font-medium">Image URL</label>
			{#if imageUrl}
				<img src={imageUrl} alt="Uploaded content" class="w-48 rounded-lg" />
			{/if}
			<UploadDropzone {uploader} />
			<input type="hidden" name="imageUrl" value={imageUrl} />
		</div>

		<div>
			<label for="price" class="block text-sm font-medium">Price (tokens)</label>
			<input
				type="number"
				id="price"
				name="price"
				min="1"
				value={form && 'price' in form ? form.price || '' : ''}
				required
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<div>
			<label for="price" class="block text-sm font-medium">USD Cost</label>
			<input
				type="number"
				id="usd-cost"
				name="usd-cost"
				min="1"
				value={form && 'usd-cost' in form ? form['usd-cost']	 || '' : ''}
				required
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<div>
			<label for="type" class="block text-sm font-medium">Type</label>
			<select
				id="type"
				name="type"
				required
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			>
				<option value="">Select type...</option>
				<option value="hcb" selected={form && 'type' in form ? form.type === 'hcb' : false}
					>HCB</option
				>
				<option
					value="third_party"
					selected={form && 'type' in form ? form.type === 'third_party' : false}
					>Third Party</option
				>
			</select>
		</div>

		<div>
			<label for="hcbMids" class="block text-sm font-medium"
				>HCB MIDs (comma-separated, optional)</label
			>
			<input
				type="text"
				id="hcbMids"
				name="hcbMids"
				value={form && 'hcbMids' in form ? form.hcbMids || '' : ''}
				placeholder="mid1, mid2, mid3"
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<button
			type="submit"
			disabled={!imageUrl}
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		>
			Create Item
		</button>
	</form>
</div>
