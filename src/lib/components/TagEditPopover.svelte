<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { Input } from '$lib/components/ui/input';
	import { Check, Tag as TagIcon } from 'lucide-svelte';
	import TagLucideIcon from '$lib/components/TagLucideIcon.svelte';
	import { iconMap } from '$lib/utils/icons';
	import { TAG_COLORS, tagHex, normalizeTag, type Tag, type TagColor } from '$lib/utils/tags-core';

	interface Props {
		open?: boolean;
		catalog: Tag[];        // all tags in the env
		selected: number[];    // currently-assigned tag ids
		/** Create a catalog tag; resolves to the created/existing Tag. */
		onCreate: (name: string, color: TagColor, icon: string | null) => Promise<Tag | null>;
		/** Persist the new assignment set. */
		onApply: (tagIds: number[]) => void;
		/** Whether the current user may create catalog tags (admin only). Assigning existing tags is always allowed. */
		allowCreate?: boolean;
	}
	let { open = $bindable(false), catalog, selected, onCreate, onApply, allowCreate = false }: Props = $props();

	let query = $state('');
	let newColor = $state<TagColor>('blue');
	let newIcon = $state<string | null>(null);
	let iconSearch = $state('');
	let creating = $state(false);

	const allIconNames = Object.keys(iconMap);
	const iconResults = $derived(
		iconSearch.trim()
			? allIconNames.filter((n) => n.toLowerCase().includes(iconSearch.trim().toLowerCase()))
			: allIconNames
	);

	const filtered = $derived(
		query.trim()
			? catalog.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
			: catalog
	);
	const canCreate = $derived.by(() => {
		if (!allowCreate) return false;
		const n = normalizeTag(query);
		return !!n && !catalog.some((t) => t.name.toLowerCase() === n.toLowerCase());
	});

	function toggle(id: number) {
		onApply(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
	}

	async function create() {
		const name = normalizeTag(query);
		if (!name || creating) return;
		creating = true;
		try {
			const tag = await onCreate(name, newColor, newIcon);
			if (tag) {
				query = '';
				newColor = 'blue';
				newIcon = null;
				iconSearch = '';
				if (!selected.includes(tag.id)) onApply([...selected, tag.id]);
			}
		} finally {
			creating = false;
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button {...props} type="button" title="Edit tags"
				class="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground">
				<TagIcon class="h-3 w-3" />
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-64 p-2" align="start">
		<Input bind:value={query} placeholder={allowCreate ? 'Search or create a tag...' : 'Search tags...'} class="h-8 text-sm"
			onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' && canCreate) create(); }} />

		{#if canCreate}
			{@const hex = tagHex(newColor)}
			<div class="mt-2 rounded-md border p-2">
				<div class="text-2xs text-muted-foreground">Create new tag</div>
				<!-- Live preview of the pill. -->
				<div class="my-1.5">
					<span class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-2xs font-medium"
						style="color: {hex}; background-color: {hex}1a; border-color: {hex}33;">
						{#if newIcon}<TagLucideIcon name={newIcon} class="h-2.5 w-2.5 shrink-0" />{:else}<TagIcon class="h-2.5 w-2.5 shrink-0" />{/if}
						{normalizeTag(query)}
					</span>
				</div>
				<div class="grid grid-cols-8 gap-1">
					{#each TAG_COLORS as c}
						<button type="button" title={c} onclick={() => (newColor = c)}
							class="h-3.5 w-3.5 rounded-full ring-offset-1 ring-offset-background {newColor === c ? 'ring-2 ring-foreground' : ''}"
							style="background-color: {tagHex(c)};"></button>
					{/each}
				</div>
				<!-- Icon picker: default tag icon, or a lucide icon. -->
				<div class="mt-2">
					<Input bind:value={iconSearch} placeholder="Icon (optional)..." class="h-7 text-2xs" />
					<div class="mt-1 grid grid-cols-8 gap-0.5 max-h-24 overflow-y-auto p-0.5">
						<button type="button" title="Default tag icon" onclick={() => (newIcon = null)}
							class="flex aspect-square items-center justify-center rounded hover:bg-muted {newIcon === null ? 'bg-primary/15 ring-1 ring-inset ring-primary' : ''}">
							<TagIcon class="h-3.5 w-3.5" style="color: {hex};" />
						</button>
						{#each iconResults as ic (ic)}
							<button type="button" title={ic} onclick={() => (newIcon = ic)}
								class="flex aspect-square items-center justify-center rounded hover:bg-muted {newIcon === ic ? 'bg-primary/15 ring-1 ring-inset ring-primary' : ''}">
								<TagLucideIcon name={ic} class="h-3.5 w-3.5" style="color: {hex};" />
							</button>
						{/each}
					</div>
				</div>
				<button type="button" onclick={create} disabled={creating}
					class="mt-2 w-full rounded bg-primary px-2 py-1 text-2xs font-medium text-primary-foreground disabled:opacity-50">Create</button>
			</div>
		{/if}

		<div class="mt-2 max-h-56 overflow-y-auto">
			{#if filtered.length === 0 && !canCreate}
				<div class="px-2 py-3 text-center text-xs text-muted-foreground">No tags</div>
			{/if}
			{#each filtered as tag (tag.id)}
				{@const isSel = selected.includes(tag.id)}
				<button type="button" onclick={() => toggle(tag.id)}
					class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
					{#if tag.icon}
						<TagLucideIcon name={tag.icon} class="h-3.5 w-3.5 shrink-0" style="color: {tagHex(tag.color)};" />
					{:else}
						<span class="h-2 w-2 shrink-0 rounded-full" style="background-color: {tagHex(tag.color)};"></span>
					{/if}
					<span class="truncate">{tag.name}</span>
					{#if isSel}<Check class="ml-auto h-3.5 w-3.5 text-primary shrink-0" />{/if}
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
