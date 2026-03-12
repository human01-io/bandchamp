<script lang="ts">
  import { onMount } from 'svelte';
  import { wishlistItems, loadWishlist, removeFromWishlist, updateWishlistItem } from '$lib/stores/wishlist';
  import { albumsById } from '$lib/stores/collection';
  import type { WishlistItem } from '@bandchamp/shared';

  onMount(() => {
    loadWishlist();
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedItems = $derived(
    [...$wishlistItems].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]),
  );

  const priorityColors = {
    high: 'text-danger',
    medium: 'text-warning',
    low: 'text-text-dim',
  };

  async function cyclePriority(item: WishlistItem) {
    const next = item.priority === 'high' ? 'medium' : item.priority === 'medium' ? 'low' : 'high';
    await updateWishlistItem({ ...item, priority: next });
  }
</script>

<div class="px-4 py-6 sm:px-6 sm:py-8">
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-2 text-2xl font-bold">Wishlist</h1>
    <p class="mb-8 text-sm text-text-muted">{$wishlistItems.length} items</p>

    {#if sortedItems.length === 0}
      <div class="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-card py-16">
        <p class="text-lg text-text-muted">Your wishlist is empty</p>
        <p class="mt-2 text-sm text-text-dim">Add albums from the collection detail page</p>
      </div>
    {:else}
      <div class="space-y-2">
        {#each sortedItems as item (item.id)}
          {@const album = $albumsById.get(item.albumId)}
          {#if album}
            <div class="flex items-center gap-4 rounded-lg border border-border bg-bg-card p-3 transition-colors hover:bg-bg-hover">
              <!-- Priority -->
              <button
                onclick={() => cyclePriority(item)}
                class="shrink-0 text-sm font-medium uppercase {priorityColors[item.priority]}"
                title="Click to cycle priority"
              >
                {item.priority === 'high' ? '!!!' : item.priority === 'medium' ? '!!' : '!'}
              </button>

              <!-- Cover -->
              {#if album.coverArtUrlSmall || album.coverArtUrl}
                <img
                  src={album.coverArtUrlSmall || album.coverArtUrl}
                  alt={album.title}
                  class="h-12 w-12 shrink-0 rounded object-cover"
                />
              {/if}

              <!-- Info -->
              <a href="/collection/{encodeURIComponent(album.id)}" class="min-w-0 flex-1 hover:text-accent">
                <div class="truncate text-sm font-medium">{album.title}</div>
                <div class="truncate text-xs text-text-muted">{album.artistName}</div>
              </a>

              <!-- Notes -->
              {#if item.notes}
                <span class="hidden truncate text-xs text-text-dim md:block max-w-[200px]">
                  {item.notes}
                </span>
              {/if}

              <!-- Date -->
              <span class="hidden shrink-0 text-xs text-text-dim sm:block">
                {new Date(item.addedAt).toLocaleDateString()}
              </span>

              <!-- Bandcamp link -->
              <a
                href={album.bandcampUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="hidden shrink-0 text-xs text-text-muted hover:text-accent sm:block"
              >
                Open
              </a>

              <!-- Remove -->
              <button
                onclick={() => removeFromWishlist(item.albumId)}
                class="shrink-0 text-text-dim transition-colors hover:text-danger"
              >
                &times;
              </button>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
