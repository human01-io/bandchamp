<script lang="ts">
  import { albums, allTags } from '$lib/stores/collection';
  import { buildRecommendations, buildTagProfile, digCrate } from '@bandchamp/shared';
  import type { Album, Recommendation } from '@bandchamp/shared';

  type Tab = 'recommendations' | 'genre' | 'digcrate';
  let activeTab: Tab = $state('recommendations');

  // ─── Recommendations ──────────────────
  const recommendations = $derived(buildRecommendations($albums));

  // ─── Genre Explorer ────────────────────
  const tagProfile = $derived(buildTagProfile($albums));
  const maxTagWeight = $derived(tagProfile[0]?.weight || 1);

  // ─── Dig Crate ─────────────────────────
  let crateResults: Album[] = $state([]);
  let crateCount = $state(1);
  let crateUnratedOnly = $state(false);
  let crateTag = $state('');
  let spinning = $state(false);

  function spin() {
    spinning = true;
    // Small delay for animation feel
    setTimeout(() => {
      crateResults = digCrate($albums, crateCount, {
        tags: crateTag ? [crateTag] : undefined,
        unratedOnly: crateUnratedOnly,
      });
      spinning = false;
    }, 400);
  }
</script>

<div class="flex h-full flex-col">
  <!-- Tab bar -->
  <div class="flex border-b border-border">
    {#each [
      { id: 'recommendations', label: 'For You' },
      { id: 'genre', label: 'Genre Map' },
      { id: 'digcrate', label: 'Dig Crate' },
    ] as tab}
      <button
        onclick={() => (activeTab = tab.id as Tab)}
        class="flex-1 px-3 py-3 text-sm font-medium transition-colors sm:flex-none sm:px-6
               {activeTab === tab.id
                 ? 'border-b-2 border-accent text-accent'
                 : 'text-text-muted hover:text-text'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
    {#if $albums.length === 0}
      <div class="flex flex-col items-center justify-center py-20">
        <h2 class="text-xl font-semibold text-text-muted">No collection data</h2>
        <p class="mt-2 text-sm text-text-dim">Import your collection to unlock discovery features</p>
        <a href="/settings" class="mt-4 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg">
          Import Collection
        </a>
      </div>

    {:else if activeTab === 'recommendations'}
      <!-- Recommendations -->
      <div class="mx-auto max-w-5xl space-y-10">
        {#if recommendations.length === 0}
          <p class="text-center text-text-muted py-12">Add more albums to get personalized recommendations</p>
        {/if}
        {#each recommendations as rec}
          <div>
            <h3 class="mb-4 text-lg font-semibold">
              {rec.reason}
              <span class="ml-2 rounded-full bg-bg-card px-2 py-0.5 text-xs font-normal text-text-dim">
                {rec.type}
              </span>
            </h3>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {#each rec.albums as album (album.id)}
                <a href="/collection/{encodeURIComponent(album.id)}" class="group">
                  {#if album.coverArtUrl}
                    <img
                      src={album.coverArtUrl}
                      alt={album.title}
                      loading="lazy"
                      class="aspect-square w-full rounded-lg object-cover transition-opacity group-hover:opacity-80"
                    />
                  {:else}
                    <div class="flex aspect-square w-full items-center justify-center rounded-lg bg-bg-card text-xs text-text-dim">
                      No Art
                    </div>
                  {/if}
                  <p class="mt-1 truncate text-xs font-medium group-hover:text-accent">{album.title}</p>
                  <p class="truncate text-[10px] text-text-muted">{album.artistName}</p>
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </div>

    {:else if activeTab === 'genre'}
      <!-- Genre Map (tag bubble chart) -->
      <div class="mx-auto max-w-4xl">
        <h2 class="mb-2 text-lg font-semibold">Your Tag Landscape</h2>
        <p class="mb-6 text-sm text-text-muted">Size reflects how much of your collection uses each tag</p>

        <div class="flex flex-wrap items-center gap-2">
          {#each tagProfile.slice(0, 60) as { tag, count, weight }}
            {@const size = 0.6 + (weight / maxTagWeight) * 1.4}
            {@const opacity = 0.4 + (weight / maxTagWeight) * 0.6}
            <a
              href="/collection?tag={encodeURIComponent(tag)}"
              class="inline-flex items-center rounded-full border border-border px-3 py-1 transition-all
                     hover:border-accent hover:text-accent"
              style="font-size: {size}rem; opacity: {opacity};"
            >
              {tag}
              <span class="ml-1.5 text-[0.65em] text-text-dim">({count})</span>
            </a>
          {/each}
        </div>

        <!-- Genre distribution bars -->
        <div class="mt-10">
          <h3 class="mb-4 text-sm font-semibold uppercase text-text-dim">Top 20 Tags</h3>
          <div class="space-y-2">
            {#each tagProfile.slice(0, 20) as { tag, count, weight }}
              <div class="flex items-center gap-3">
                <span class="w-20 shrink-0 truncate text-right text-sm text-text-muted sm:w-28">{tag}</span>
                <div class="relative h-6 flex-1 overflow-hidden rounded bg-bg-card">
                  <div
                    class="h-full rounded bg-accent transition-all duration-500"
                    style="width: {(weight / maxTagWeight) * 100}%"
                  ></div>
                </div>
                <span class="w-8 shrink-0 text-right text-xs text-text-dim">{count}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>

    {:else if activeTab === 'digcrate'}
      <!-- Dig Crate -->
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="mb-2 text-2xl font-bold">Dig Crate</h2>
        <p class="mb-8 text-text-muted">Rediscover albums from your collection</p>

        <!-- Controls -->
        <div class="mb-8 flex flex-wrap items-center justify-center gap-4">
          <div class="flex items-center gap-2">
            <label for="crate-count" class="text-sm text-text-muted">Pick</label>
            <select
              id="crate-count"
              bind:value={crateCount}
              class="rounded border border-border bg-bg-input px-2 py-1 text-sm text-text"
            >
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
            <span class="text-sm text-text-muted">album{crateCount > 1 ? 's' : ''}</span>
          </div>

          <select
            bind:value={crateTag}
            class="rounded border border-border bg-bg-input px-2 py-1 text-sm text-text"
          >
            <option value="">Any genre</option>
            {#each $allTags.slice(0, 30) as { tag }}
              <option value={tag}>{tag}</option>
            {/each}
          </select>

          <label class="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" bind:checked={crateUnratedOnly} class="accent-accent" />
            Unrated only
          </label>
        </div>

        <!-- Spin button -->
        <button
          onclick={spin}
          disabled={spinning}
          class="mb-10 inline-flex h-20 w-20 items-center justify-center rounded-full bg-accent
                 text-2xl font-bold text-bg shadow-lg transition-all hover:scale-105
                 hover:bg-accent-hover active:scale-95 disabled:animate-spin disabled:opacity-70"
        >
          {spinning ? '◌' : '▶'}
        </button>

        <!-- Results -->
        {#if crateResults.length > 0}
          <div class="grid gap-6 {crateResults.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}">
            {#each crateResults as album, i (album.id)}
              <a
                href="/collection/{encodeURIComponent(album.id)}"
                class="group transform animate-fade-in"
                style="animation-delay: {i * 100}ms"
              >
                {#if album.coverArtUrl}
                  <img
                    src={album.coverArtUrl}
                    alt={album.title}
                    class="aspect-square w-full rounded-xl object-cover shadow-lg transition-transform
                           group-hover:scale-105"
                  />
                {:else}
                  <div class="flex aspect-square w-full items-center justify-center rounded-xl bg-bg-card text-text-dim">
                    No Art
                  </div>
                {/if}
                <p class="mt-2 text-sm font-semibold group-hover:text-accent">{album.title}</p>
                <p class="text-xs text-text-muted">{album.artistName}</p>
                {#if album.userRating}
                  <div class="mt-0.5 text-xs text-warning">
                    {'★'.repeat(album.userRating)}
                  </div>
                {/if}
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  :global(.animate-fade-in) {
    animation: fade-in 0.4s ease-out both;
  }
</style>
