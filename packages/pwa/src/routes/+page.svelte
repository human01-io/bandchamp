<script lang="ts">
  import { albums, artists, albumCount, artistCount, allTags } from '$lib/stores/collection';

  const recentAlbums = $derived($albums.slice().sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 8));
  const topTags = $derived($allTags.slice(0, 12));
  const ratedAlbums = $derived($albums.filter((a) => a.userRating).length);
  const taggedAlbums = $derived($albums.filter((a) => a.userTags.length > 0).length);
</script>

<div class="px-4 py-6 sm:px-6 sm:py-8">
  <div class="mx-auto max-w-6xl">
    {#if $albumCount === 0}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center rounded-2xl border border-border bg-bg-card py-20">
        <h2 class="text-2xl font-semibold">Get started</h2>
        <p class="mt-2 text-text-muted">Import your Bandcamp collection to unlock all features</p>
        <a
          href="/settings"
          class="mt-6 rounded-lg bg-accent px-6 py-3 font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          Import Collection
        </a>
      </div>
    {:else}
      <!-- Stats -->
      <div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-xl border border-border bg-bg-card p-5">
          <div class="text-3xl font-bold text-accent">{$albumCount}</div>
          <div class="mt-1 text-sm text-text-muted">Albums</div>
        </div>
        <div class="rounded-xl border border-border bg-bg-card p-5">
          <div class="text-3xl font-bold text-accent">{$artistCount}</div>
          <div class="mt-1 text-sm text-text-muted">Artists</div>
        </div>
        <div class="rounded-xl border border-border bg-bg-card p-5">
          <div class="text-3xl font-bold text-accent">{ratedAlbums}</div>
          <div class="mt-1 text-sm text-text-muted">Rated</div>
        </div>
        <div class="rounded-xl border border-border bg-bg-card p-5">
          <div class="text-3xl font-bold text-accent">{taggedAlbums}</div>
          <div class="mt-1 text-sm text-text-muted">Tagged</div>
        </div>
      </div>

      <!-- Quick links -->
      <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <a
          href="/graph"
          class="group rounded-xl border border-border bg-bg-card p-5 transition-colors hover:border-accent"
        >
          <div class="text-lg font-semibold group-hover:text-accent">Network Graph</div>
          <p class="mt-1 text-sm text-text-muted">Explore connections in your collection</p>
        </a>
        <a
          href="/discover"
          class="group rounded-xl border border-border bg-bg-card p-5 transition-colors hover:border-accent"
        >
          <div class="text-lg font-semibold group-hover:text-accent">Discover</div>
          <p class="mt-1 text-sm text-text-muted">Find new music based on your taste</p>
        </a>
        <a
          href="/collection"
          class="group rounded-xl border border-border bg-bg-card p-5 transition-colors hover:border-accent"
        >
          <div class="text-lg font-semibold group-hover:text-accent">Collection</div>
          <p class="mt-1 text-sm text-text-muted">Browse, filter, and manage your albums</p>
        </a>
      </div>

      <!-- Recently added -->
      {#if recentAlbums.length > 0}
        <div class="mb-8">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold">Recently Added</h2>
            <a href="/collection" class="text-sm text-accent hover:text-accent-hover">View all</a>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {#each recentAlbums as album (album.id)}
              <a href="/collection/{encodeURIComponent(album.id)}" class="group">
                {#if album.coverArtUrl}
                  <img
                    src={album.coverArtUrl}
                    alt={album.title}
                    loading="lazy"
                    class="aspect-square w-full rounded-lg object-cover transition-opacity group-hover:opacity-80"
                  />
                {:else}
                  <div class="flex aspect-square w-full items-center justify-center rounded-lg bg-bg-card text-text-dim text-xs">
                    No Art
                  </div>
                {/if}
                <p class="mt-1.5 truncate text-xs font-medium group-hover:text-accent">{album.title}</p>
                <p class="truncate text-[10px] text-text-muted">{album.artistName}</p>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Top tags -->
      {#if topTags.length > 0}
        <div>
          <h2 class="mb-3 text-lg font-semibold">Your Top Tags</h2>
          <div class="flex flex-wrap gap-2">
            {#each topTags as { tag, count }}
              <a
                href="/collection?tag={encodeURIComponent(tag)}"
                class="rounded-full border border-border px-3 py-1.5 text-sm text-text-muted
                       transition-colors hover:border-accent hover:text-accent"
              >
                {tag} <span class="text-text-dim">({count})</span>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
