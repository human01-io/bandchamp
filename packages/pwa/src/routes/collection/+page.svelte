<script lang="ts">
  import { albums, isLoading } from '$lib/stores/collection';
  import { filteredAlbums, filters } from '$lib/stores/filters';
  import { isImporting } from '$lib/stores/import';
  import FilterBar from '$lib/components/collection/FilterBar.svelte';
  import AlbumCard from '$lib/components/collection/AlbumCard.svelte';
  import AlbumListRow from '$lib/components/collection/AlbumListRow.svelte';
  import BulkActions from '$lib/components/collection/BulkActions.svelte';

  let selectedIds = $state(new Set<string>());
  let selectMode = $state(false);

  // Image loading progress — only tracked during active imports
  let imagesWithArt = $derived(
    $filteredAlbums.filter((a) => a.coverArtUrl || a.coverArtUrlSmall).length,
  );
  let imagesSettled = $state(0);
  let showImageProgress = $state(false);
  let allImagesReady = $derived(imagesWithArt === 0 || imagesSettled >= imagesWithArt);

  function handleImageSettled() {
    imagesSettled++;
  }

  // Only reset and show progress bar when an import starts
  $effect(() => {
    if ($isImporting) {
      imagesSettled = 0;
      showImageProgress = true;
    }
  });

  // Hide once all images are loaded
  $effect(() => {
    if (allImagesReady && showImageProgress) {
      showImageProgress = false;
    }
  });

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function clearSelection() {
    selectedIds = new Set();
    selectMode = false;
  }

  function selectAll() {
    selectedIds = new Set($filteredAlbums.map((a) => a.id));
  }

  function toggleSelectMode() {
    if (selectMode) {
      clearSelection();
    } else {
      selectMode = true;
    }
  }
</script>

<div class="flex h-full flex-col">
  <FilterBar />
  <BulkActions {selectedIds} onClearSelection={clearSelection} />

  <!-- Toolbar -->
  <div class="flex items-center justify-between px-4 py-3 sm:px-6">
    <p class="text-sm text-text-muted">
      {$filteredAlbums.length} of {$albums.length} albums
    </p>
    <div class="flex items-center gap-3">
      {#if selectMode}
        <button onclick={selectAll} class="text-xs text-text-muted hover:text-text">
          Select all
        </button>
      {/if}
      <button
        onclick={toggleSelectMode}
        class="rounded px-2 py-1 text-xs transition-colors
               {selectMode ? 'bg-accent-dim text-accent' : 'text-text-muted hover:text-text'}"
      >
        {selectMode ? 'Cancel Select' : 'Select'}
      </button>
    </div>
  </div>

  <!-- Image loading progress -->
  {#if showImageProgress && !allImagesReady && $filteredAlbums.length > 0}
    <div class="px-4 pb-2 sm:px-6">
      <div class="flex items-center gap-3">
        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
          <div
            class="h-full rounded-full bg-accent transition-all duration-300"
            style="width: {Math.round((imagesSettled / imagesWithArt) * 100)}%"
          ></div>
        </div>
        <span class="shrink-0 text-xs text-text-muted">
          Loading covers {imagesSettled}/{imagesWithArt}
        </span>
      </div>
    </div>
  {/if}

  <!-- Content -->
  <div class="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
    {#if $isLoading}
      <div class="flex items-center justify-center py-20">
        <p class="text-text-muted">Loading collection...</p>
      </div>
    {:else if $filteredAlbums.length === 0}
      <div class="flex flex-col items-center justify-center py-20">
        {#if $albums.length === 0}
          <p class="text-lg text-text-muted">Your collection is empty</p>
          <a
            href="/settings"
            class="mt-4 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg
                   transition-colors hover:bg-accent-hover"
          >
            Import from Bandcamp
          </a>
        {:else}
          <p class="text-text-muted">No albums match your filters</p>
          <button
            onclick={() => filters.set({
              search: '', tags: [], userTags: [], artists: [], labels: [],
              minRating: 0, hasRating: null, sortBy: 'dateAdded', sortDir: 'desc', viewMode: $filters.viewMode,
            })}
            class="mt-2 text-sm text-accent hover:text-accent-hover"
          >
            Clear filters
          </button>
        {/if}
      </div>
    {:else if $filters.viewMode === 'grid'}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {#each $filteredAlbums as album (album.id)}
          <AlbumCard
            {album}
            selected={selectedIds.has(album.id)}
            selectable={selectMode}
            onToggleSelect={toggleSelect}
            onImageSettled={handleImageSettled}
          />
        {/each}
      </div>
    {:else}
      <div class="space-y-0.5">
        {#each $filteredAlbums as album (album.id)}
          <AlbumListRow
            {album}
            selected={selectedIds.has(album.id)}
            selectable={selectMode}
            onToggleSelect={toggleSelect}
            onImageSettled={handleImageSettled}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>
