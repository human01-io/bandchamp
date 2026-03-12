<script lang="ts">
  import { page } from '$app/stores';
  import { albumsById, updateAlbum, albums } from '$lib/stores/collection';
  import { wishlistByAlbumId, addToWishlist, removeFromWishlist, loadWishlist } from '$lib/stores/wishlist';
  import { playAlbum, playerState } from '$lib/stores/player';
  import { findSimilarAlbums, getTracksByAlbum, putTracks, parseTrackPageCollectorCount, type Track } from '@bandchamp/shared';
  import { onMount } from 'svelte';

  const albumId = $derived(decodeURIComponent($page.params.albumId ?? ''));
  const album = $derived($albumsById.get(albumId));
  const isWishlisted = $derived($wishlistByAlbumId.has(albumId));

  let cachedTracks = $state<Track[]>([]);

  onMount(() => {
    loadWishlist();
  });

  $effect(() => {
    if (albumId) {
      getTracksByAlbum(albumId).then((t) => {
        cachedTracks = t.sort((a, b) => a.trackNumber - b.trackNumber);
      });
    }
  });

  /** Enrich tracks with per-track collector counts (only on this detail page) */
  let trackEnrichStarted = $state(false);
  $effect(() => {
    if (cachedTracks.length === 0 || !album || trackEnrichStarted) return;
    const tracksNeedingEnrich = cachedTracks.filter((t) => t.trackPath && t.collectorCount == null);
    if (tracksNeedingEnrich.length === 0) return;
    trackEnrichStarted = true;

    // Derive base URL from the album's bandcamp URL (strip path)
    const base = new URL(album.bandcampUrl).origin;

    (async () => {
      for (const track of tracksNeedingEnrich) {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(base + track.trackPath)}`);
          const html = await res.text();
          const count = parseTrackPageCollectorCount(html);
          if (count != null) {
            track.collectorCount = count;
            cachedTracks = [...cachedTracks]; // trigger reactivity
            await putTracks([track]);
          }
          // Rate limit: 500ms between requests
          await new Promise((r) => setTimeout(r, 500));
        } catch {
          // Skip failed track enrichment
        }
      }
    })();
  });

  const isCurrentAlbum = $derived(
    $playerState.currentTrack?.albumId === albumId,
  );

  function formatDuration(seconds: number): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handlePlayAlbum() {
    if (album) playAlbum(album);
  }

  function handlePlayTrack(index: number) {
    if (album) playAlbum(album, index);
  }
  const similarAlbums = $derived(album ? findSimilarAlbums(album, $albums, 6) : []);

  let tagInput = $state('');
  let rating = $state(0);
  let notes = $state('');
  let showAllCollectors = $state(false);
  let showFullAbout = $state(false);

  function formatPrice(price: number | undefined, currency: string | undefined): string {
    if (price == null) return '';
    if (!currency) return String(price);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
    } catch {
      return `${price} ${currency}`;
    }
  }

  const vinylOffer = $derived(album?.offers?.find((o) => o.format === 'VinylFormat'));
  const otherPhysical = $derived(
    album?.offers?.filter((o) => o.format !== 'DigitalFormat' && o.format !== 'VinylFormat') ?? [],
  );

  $effect(() => {
    if (album) {
      rating = album.userRating ?? 0;
      notes = album.userNotes ?? '';
    }
  });

  async function setRating(value: number) {
    if (!album) return;
    rating = value === rating ? 0 : value;
    await updateAlbum({ ...album, userRating: rating || undefined });
  }

  async function saveNotes() {
    if (!album) return;
    await updateAlbum({ ...album, userNotes: notes || undefined });
  }

  async function addTag() {
    if (!album || !tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase();
    if (!album.userTags.includes(tag)) {
      await updateAlbum({ ...album, userTags: [...album.userTags, tag] });
    }
    tagInput = '';
  }

  async function removeTag(tag: string) {
    if (!album) return;
    await updateAlbum({ ...album, userTags: album.userTags.filter((t) => t !== tag) });
  }

  async function toggleWishlist() {
    if (!album) return;
    if (isWishlisted) {
      await removeFromWishlist(album.id);
    } else {
      await addToWishlist(album.id);
    }
  }
</script>

{#if album}
  <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
    <a href="/collection" class="mb-4 inline-flex items-center gap-2 text-sm text-text-muted hover:text-text sm:mb-6">
      &larr; Back to Collection
    </a>

    <div class="flex flex-col gap-6 sm:gap-8 md:flex-row">
      <!-- Cover Art -->
      <div class="shrink-0">
        {#if album.coverArtUrl}
          <img
            src={album.coverArtUrl}
            alt={album.title}
            class="h-48 w-48 rounded-lg object-cover shadow-lg sm:h-64 sm:w-64"
          />
        {:else}
          <div class="flex h-48 w-48 items-center justify-center rounded-lg bg-bg-card text-text-dim sm:h-64 sm:w-64">
            No Art
          </div>
        {/if}
      </div>

      <!-- Details -->
      <div class="flex-1">
        <h1 class="text-2xl font-bold">{album.title}</h1>
        <p class="mt-1 text-lg text-text-muted">{album.artistName}</p>
        {#if album.labelName}
          <p class="mt-1 text-sm text-text-dim">
            {album.labelName}{#if album.labelLocation} &mdash; {album.labelLocation}{/if}
          </p>
        {/if}

        <!-- Rating -->
        <div class="mt-4 flex items-center gap-1">
          {#each [1, 2, 3, 4, 5] as star}
            <button
              onclick={() => setRating(star)}
              class="text-2xl transition-colors {star <= rating ? 'text-warning' : 'text-text-dim hover:text-warning'}"
            >
              {star <= rating ? '★' : '☆'}
            </button>
          {/each}
        </div>

        <!-- Bandcamp Tags -->
        {#if album.tags.length > 0}
          <div class="mt-4">
            <span class="text-xs font-medium uppercase text-text-dim">Tags</span>
            <div class="mt-1 flex flex-wrap gap-1.5">
              {#each album.tags as tag}
                <span class="rounded-full bg-bg px-2.5 py-0.5 text-xs text-text-muted">{tag}</span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- User Tags -->
        <div class="mt-4">
          <span class="text-xs font-medium uppercase text-text-dim">Your Tags</span>
          <div class="mt-1 flex flex-wrap items-center gap-1.5">
            {#each album.userTags as tag}
              <span class="group flex items-center gap-1 rounded-full bg-accent-dim px-2.5 py-0.5 text-xs text-accent">
                {tag}
                <button onclick={() => removeTag(tag)} class="opacity-0 transition-opacity group-hover:opacity-100">
                  &times;
                </button>
              </span>
            {/each}
            <form onsubmit={(e) => { e.preventDefault(); addTag(); }} class="inline">
              <input
                type="text"
                bind:value={tagInput}
                placeholder="+ add tag"
                class="w-20 border-none bg-transparent px-1 text-xs text-text-muted placeholder:text-text-dim focus:outline-none"
              />
            </form>
          </div>
        </div>

        <!-- About -->
        {#if album.about}
          <div class="mt-4">
            <span class="text-xs font-medium uppercase text-text-dim">About</span>
            <div class="mt-1 text-sm text-text-muted leading-relaxed">
              {#if album.about.length > 200 && !showFullAbout}
                <p>{album.about.slice(0, 200)}...</p>
                <button onclick={() => (showFullAbout = true)} class="mt-1 text-xs text-accent hover:underline">
                  read more
                </button>
              {:else}
                <p class="whitespace-pre-line">{album.about}</p>
              {/if}
            </div>
          </div>
        {/if}

        {#if album.credits}
          <div class="mt-3">
            <span class="text-xs font-medium uppercase text-text-dim">Credits</span>
            <p class="mt-1 whitespace-pre-line text-xs text-text-dim leading-relaxed">{album.credits}</p>
          </div>
        {/if}

        <!-- Available Formats -->
        {#if album.offers?.length}
          <div class="mt-4">
            <span class="text-xs font-medium uppercase text-text-dim">Available Formats</span>
            <div class="mt-1.5 flex flex-wrap gap-2">
              {#each album.offers as offer}
                <span
                  class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs
                         {offer.soldOut
                           ? 'border-border text-text-dim line-through'
                           : offer.format === 'VinylFormat'
                             ? 'border-warning/40 text-warning'
                             : 'border-border text-text-muted'}"
                >
                  {offer.formatName || offer.format.replace('Format', '')}
                  {#if offer.price != null}
                    <span class="font-medium {offer.soldOut ? '' : 'text-text'}">
                      {offer.price === 0 ? 'NYP' : formatPrice(offer.price, offer.priceCurrency)}
                    </span>
                  {/if}
                  {#if offer.soldOut}
                    <span class="no-underline text-text-dim"> Sold Out</span>
                  {/if}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Label Info -->
        {#if album.labelAbout}
          <div class="mt-4">
            <span class="text-xs font-medium uppercase text-text-dim">Label</span>
            <p class="mt-1 text-xs text-text-dim leading-relaxed">{album.labelAbout}</p>
          </div>
        {/if}

        <!-- Notes -->
        <div class="mt-6">
          <span class="text-xs font-medium uppercase text-text-dim">Notes</span>
          <textarea
            bind:value={notes}
            onblur={saveNotes}
            placeholder="Add notes about this album..."
            rows="3"
            class="mt-1 w-full resize-none rounded-lg border border-border bg-bg-input px-3 py-2 text-sm
                   text-text placeholder:text-text-dim focus:border-border-focus focus:outline-none"
          ></textarea>
        </div>

        <!-- Meta -->
        <div class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-dim">
          {#if album.purchaseDate}
            <span>Purchased: {new Date(album.purchaseDate).toLocaleDateString()}</span>
          {/if}
          {#if album.trackCount}
            <span>{album.trackCount} tracks</span>
          {/if}
          {#if album.format}
            <span>{album.format}</span>
          {/if}
          {#if album.releaseDate}
            <span>Released: {new Date(album.releaseDate).toLocaleDateString()}</span>
          {/if}
          {#if album.collectorCount}
            <span>{album.collectorCount.toLocaleString()} supporters</span>
          {/if}
        </div>

        <!-- Actions -->
        <div class="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onclick={handlePlayAlbum}
            disabled={$playerState.isLoading}
            class="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium
                   text-bg transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {#if $playerState.isLoading && isCurrentAlbum}
              Loading...
            {:else if isCurrentAlbum && $playerState.isPlaying}
              Playing
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play
            {/if}
          </button>
          <a
            href={album.bandcampUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm
                   text-text-muted transition-colors hover:border-border-focus hover:text-text"
          >
            Open on Bandcamp &nearr;
          </a>
          <button
            onclick={toggleWishlist}
            class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors
                   {isWishlisted
                     ? 'border-danger text-danger hover:bg-danger/10'
                     : 'border-border text-text-muted hover:border-accent hover:text-accent'}"
          >
            {isWishlisted ? '♥ On Wishlist' : '♡ Add to Wishlist'}
          </button>
          <a
            href="/graph"
            class="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm
                   text-text-muted transition-colors hover:border-border-focus hover:text-text"
          >
            View in Graph
          </a>
        </div>
      </div>
    </div>

    <!-- Track Listing -->
    {#if cachedTracks.length > 0 || (isCurrentAlbum && $playerState.queue.length > 0)}
      {@const tracks = cachedTracks.length > 0
        ? cachedTracks
        : $playerState.queue}
      <div class="mt-10">
        <h2 class="mb-3 text-lg font-semibold">Tracks</h2>
        <div class="rounded-lg border border-border">
          {#each tracks as track, i (track.id)}
            {@const isCurrentTrack = $playerState.currentTrack?.id === track.id}
            <button
              onclick={() => handlePlayTrack(i)}
              class="flex w-full items-center gap-4 px-4 py-2.5 text-left transition-colors
                     hover:bg-bg-hover
                     {isCurrentTrack ? 'bg-bg-hover' : ''}
                     {i > 0 ? 'border-t border-border' : ''}"
            >
              <span class="w-6 text-right text-xs tabular-nums text-text-dim">
                {#if isCurrentTrack && $playerState.isPlaying}
                  <span class="text-accent">&#9654;</span>
                {:else}
                  {track.trackNumber}
                {/if}
              </span>
              <span class="flex-1 truncate text-sm {isCurrentTrack ? 'text-accent font-medium' : ''}">{track.title}</span>
              {#if 'collectorCount' in track && track.collectorCount}
                <span class="text-xs tabular-nums text-text-dim" title="{track.collectorCount} supporters">
                  {track.collectorCount.toLocaleString()} fans
                </span>
              {/if}
              <span class="text-xs tabular-nums text-text-dim">{formatDuration(track.duration)}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Supporters -->
    {#if album.collectors?.length}
      {@const maxVisible = 20}
      {@const visibleCollectors = showAllCollectors ? album.collectors : album.collectors.slice(0, maxVisible)}
      {@const remaining = album.collectors.length - maxVisible}
      <div class="mt-10">
        <h2 class="mb-3 text-lg font-semibold">
          Supported by
          <span class="text-sm font-normal text-text-dim">({album.collectorCount?.toLocaleString() ?? album.collectors.length})</span>
        </h2>
        <div class="flex flex-wrap gap-2">
          {#each visibleCollectors as collector}
            <a
              href={collector.url}
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-full border border-border px-3 py-1 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {collector.name}
            </a>
          {/each}
          {#if remaining > 0 && !showAllCollectors}
            <button
              onclick={() => (showAllCollectors = true)}
              class="rounded-full border border-border px-3 py-1 text-xs text-text-dim transition-colors hover:border-accent hover:text-accent"
            >
              +{remaining.toLocaleString()} more
            </button>
          {/if}
          {#if showAllCollectors && album.collectors.length > maxVisible}
            <button
              onclick={() => (showAllCollectors = false)}
              class="rounded-full border border-border px-3 py-1 text-xs text-text-dim transition-colors hover:border-accent hover:text-accent"
            >
              show less
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Similar Albums -->
    {#if similarAlbums.length > 0}
      <div class="mt-12">
        <h2 class="mb-4 text-lg font-semibold">Similar in Your Collection</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {#each similarAlbums as similar (similar.id)}
            <a href="/collection/{encodeURIComponent(similar.id)}" class="group">
              {#if similar.coverArtUrl}
                <img
                  src={similar.coverArtUrl}
                  alt={similar.title}
                  loading="lazy"
                  class="aspect-square w-full rounded-lg object-cover transition-opacity group-hover:opacity-80"
                />
              {:else}
                <div class="flex aspect-square w-full items-center justify-center rounded-lg bg-bg-card text-xs text-text-dim">
                  No Art
                </div>
              {/if}
              <p class="mt-1 truncate text-xs font-medium group-hover:text-accent">{similar.title}</p>
              <p class="truncate text-[10px] text-text-muted">{similar.artistName}</p>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div class="flex min-h-screen items-center justify-center">
    <p class="text-text-muted">Album not found</p>
  </div>
{/if}
