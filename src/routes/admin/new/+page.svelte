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
			toast.success('ITEM CREATED SUCCESSFULLY', {
				duration: 3000
			});
		}
		if (form?.error) {
			toast.error(`ERROR: ${form.error}`, {
				duration: 5000
			});
		}
	});

	const uploader = createUploader('imageUploader', {
		onClientUploadComplete: (res) => {
			imageUrl = res[0].ufsUrl;
		},
		onUploadError: (error: Error) => {
			alert(`ERROR: ${error.message}`);
		}
	});
</script>

<div class="mx-auto w-full max-w-2xl">
	<section class="retro-panel">
		<div class="mb-6">
			<pre class="text-coffee-500 mb-2 text-xs">&gt; ITEM CREATION MODULE</pre>
			<h1 class="retro-title text-2xl">Add New Item</h1>
			<p class="retro-subtitle mt-1">&gt; FILL ALL REQUIRED FIELDS</p>
		</div>

		<hr class="retro-divider" />

		<form method="POST" use:enhance class="mt-6 space-y-5">
			<div>
				<label for="name" class="retro-label">&gt; Item Name</label>
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
				<label for="description" class="retro-label">&gt; Description</label>
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
				<label for="imageUrl" class="retro-label">&gt; Image Upload</label>
				{#if imageUrl}
					<div class="border-coffee-600 mb-4 inline-block border-2">
						<img src={imageUrl} alt="Uploaded content" class="w-48" />
					</div>
				{/if}
				<div class="border-coffee-400 bg-cream-100 border-2 border-dashed p-4">
					<UploadDropzone {uploader} />
				</div>
				<input type="hidden" name="imageUrl" value={imageUrl} />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="price" class="retro-label">&gt; Price (Tokens)</label>
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
					<label for="usd-cost" class="retro-label">&gt; USD Cost</label>
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
				<label for="type" class="retro-label">&gt; Item Type</label>
				<select id="type" name="type" required class="retro-input">
					<option value="">-- SELECT TYPE --</option>
					<option value="hcb" selected={form && 'type' in form ? form.type === 'hcb' : false}
						>HCB</option
					>
					<option
						value="third_party"
						selected={form && 'type' in form ? form.type === 'third_party' : false}
						>THIRD PARTY</option
					>
				</select>
			</div>

			<div>
				<label for="hcbMids" class="retro-label">&gt; HCB MIDs (Optional)</label>
				<input
					type="text"
					id="hcbMids"
					name="hcbMids"
					value={form && 'hcbMids' in form ? form.hcbMids || '' : ''}
					placeholder="mid1, mid2, mid3"
					class="retro-input"
				/>
			</div>

			<hr class="retro-divider" />

			<div class="flex gap-3">
				<a href="/admin" class="retro-btn-secondary flex-1 text-center">[CANCEL]</a>
				<button type="submit" disabled={!imageUrl} class="retro-btn flex-1"> [CREATE ITEM] </button>
			</div>
		</form>
	</section>
</div>
