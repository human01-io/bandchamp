<script lang="ts">
  import { albums, updateAlbum } from '$lib/stores/collection';
  import type { Album } from '@bandchamp/shared';

  let {
    selectedIds,
    onClearSelection,
  }: {
    selectedIds: Set<string>;
    onClearSelection: () => void;
  } = $props();

  let tagInput = $state('');
  let showTagInput = $state(false);

  const selectedAlbums = $derived(
    $albums.filter((a) => selectedIds.has(a.id)),
  );

  async function bulkRate(rating: number) {
    for (const album of selectedAlbums) {
      await updateAlbum({ ...album, userRating: rating });
    }
    onClearSelection();
  }

  async function bulkAddTag() {
    if (!tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase();
    for (const album of selectedAlbums) {
      if (!album.userTags.includes(tag)) {
        await updateAlbum({ ...album, userTags: [...album.userTags, tag] });
      }
    }
    tagInput = '';
    showTagInput = false;
    onClearSelection();
  }

  function exportSelection() {
    const data = selectedAlbums.map((a) => ({
      title: a.title,
      artist: a.artistName,
      url: a.bandcampUrl,
      tags: a.userTags,
      rating: a.userRating,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bandchamp-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const header = 'Title,Artist,URL,Tags,Rating';
    const rows = selectedAlbums.map(
      (a) =>
        `"${a.title.replace(/"/g, '""')}","${a.artistName.replace(/"/g, '""')}","${a.bandcampUrl}","${a.userTags.join(';')}",${a.userRating || ''}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bandchamp-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

{#if selectedIds.size > 0}
  <div class="flex items-center gap-3 border-b border-accent-dim bg-accent-dim/30 px-6 py-2">
    <span class="text-sm font-medium text-accent">
      {selectedIds.size} selected
    </span>

    <div class="h-4 w-px bg-border"></div>

    <!-- Bulk rate -->
    <div class="flex items-center gap-0.5">
      {#each [1, 2, 3, 4, 5] as star}
        <button
          onclick={() => bulkRate(star)}
          class="text-base text-text-dim transition-colors hover:text-warning"
          title="Rate {star}"
        >
          ☆
        </button>
      {/each}
    </div>

    <div class="h-4 w-px bg-border"></div>

    <!-- Bulk tag -->
    {#if showTagInput}
      <form onsubmit={(e) => { e.preventDefault(); bulkAddTag(); }} class="flex items-center gap-2">
        <input
          type="text"
          bind:value={tagInput}
          placeholder="Tag name..."
          class="rounded border border-border bg-bg-input px-2 py-1 text-xs text-text
                 placeholder:text-text-dim focus:border-border-focus focus:outline-none"
        />
        <button type="submit" class="text-xs text-accent hover:text-accent-hover">Add</button>
        <button type="button" onclick={() => (showTagInput = false)} class="text-xs text-text-dim">Cancel</button>
      </form>
    {:else}
      <button
        onclick={() => (showTagInput = true)}
        class="text-sm text-text-muted transition-colors hover:text-text"
      >
        + Tag
      </button>
    {/if}

    <div class="h-4 w-px bg-border"></div>

    <!-- Export -->
    <button onclick={exportSelection} class="text-sm text-text-muted transition-colors hover:text-text">
      Export JSON
    </button>
    <button onclick={exportCSV} class="text-sm text-text-muted transition-colors hover:text-text">
      Export CSV
    </button>

    <div class="flex-1"></div>

    <button onclick={onClearSelection} class="text-sm text-text-dim transition-colors hover:text-text-muted">
      Deselect all
    </button>
  </div>
{/if}
