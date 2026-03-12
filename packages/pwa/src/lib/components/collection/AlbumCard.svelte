<script lang="ts">
  import type { Album } from '@bandchamp/shared';
  import { enrichAlbum, boostAlbum, deprioritizeAlbum } from '$lib/stores/enrich';

  let {
    album,
    selected = false,
    selectable = false,
    onToggleSelect,
    onImageSettled,
  }: {
    album: Album;
    selected?: boolean;
    selectable?: boolean;
    onToggleSelect?: (id: string) => void;
    onImageSettled?: () => void;
  } = $props();

  let loaded = $state(false);
  let errored = $state(false);
  let cardEl: HTMLDivElement | undefined = $state();

  let isTrack = $derived(album.itemType === 'track');
  let vinylOffer = $derived(album.offers?.find((o) => o.format === 'VinylFormat'));

  function formatPrice(price: number | undefined, currency: string | undefined): string {
    if (price == null) return '';
    if (!currency) return String(price);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
    } catch {
      return `${price} ${currency}`;
    }
  }

  function formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
  }

  function handleLoad() {
    loaded = true;
    onImageSettled?.();
  }

  function handleError() {
    errored = true;
    onImageSettled?.();
  }

  // Trigger enrichment when card scrolls into view, track visibility for priority
  $effect(() => {
    const el = cardEl;
    const needsEnrichment = !album.trackCount || !album.offers;
    if (!el || !needsEnrichment) return;

    // Snapshot to avoid re-triggering when album prop updates from enrichment
    const snap = album;
    const id = album.id;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          enrichAlbum(snap);
          boostAlbum(id);
        } else {
          deprioritizeAlbum(id);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      deprioritizeAlbum(id);
    };
  });
</script>

<div bind:this={cardEl} class="group relative rounded-lg bg-bg-card p-3 transition-colors hover:bg-bg-hover">
  {#if selectable}
    <button
      onclick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect?.(album.id); }}
      class="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border
             transition-all
             {selected
               ? 'border-accent bg-accent text-bg'
               : 'border-border bg-bg/80 text-transparent opacity-0 group-hover:opacity-100'}"
    >
      {#if selected}✓{/if}
    </button>
  {/if}

  <a href="/collection/{encodeURIComponent(album.id)}">
    {#if album.coverArtUrl && !errored}
      <div class="relative mb-3 aspect-square w-full">
        {#if !loaded}
          <div class="absolute inset-0 animate-pulse rounded-md bg-bg"></div>
        {/if}
        <img
          src={album.coverArtUrl}
          alt={album.title}
          loading="lazy"
          onload={handleLoad}
          onerror={handleError}
          class="aspect-square w-full rounded-md object-cover transition-opacity duration-300
                 {loaded ? 'opacity-100' : 'opacity-0'}"
        />
        <!-- Vinyl badge top-left -->
        {#if vinylOffer}
          <span class="absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight
                       {vinylOffer.soldOut ? 'bg-danger/90 text-bg' : 'bg-green-600/90 text-bg'}">
            {#if vinylOffer.soldOut}
              Vinyl Sold Out
            {:else}
              Vinyl{vinylOffer.price ? ` ${formatPrice(vinylOffer.price, vinylOffer.priceCurrency)}` : ''}
            {/if}
          </span>
        {/if}
        <!-- Price badge top-right -->
        {#if album.digitalPrice != null}
          {#if album.digitalPrice === 0}
            <span class="absolute top-1.5 right-1.5 rounded bg-accent/90 px-1.5 py-0.5 text-[10px] font-bold leading-tight text-bg tracking-wide">
              NYP
            </span>
          {:else}
            <span class="absolute top-1.5 right-1.5 rounded bg-bg/90 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-green-400 backdrop-blur-sm">
              {formatPrice(album.digitalPrice, album.digitalCurrency)}
            </span>
          {/if}
        {/if}
        <!-- Type badge + track count -->
        <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1">
          <span
            class="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight
                   {isTrack
                     ? 'bg-warning/90 text-bg'
                     : 'bg-accent/90 text-bg'}"
          >
            {isTrack ? 'Track' : 'Album'}
          </span>
          {#if !isTrack && album.trackCount}
            <span class="rounded bg-bg/80 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-text backdrop-blur-sm">
              {album.trackCount} tr
            </span>
          {/if}
        </div>
        {#if album.collectorCount}
          <span class="absolute bottom-1.5 right-1.5 rounded bg-bg/80 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-text backdrop-blur-sm">
            {formatCount(album.collectorCount)} fans
          </span>
        {/if}
      </div>
    {:else}
      <div class="mb-3 flex aspect-square w-full items-center justify-center rounded-md bg-bg text-text-dim text-xs">
        No Art
      </div>
    {/if}
    <h3 class="truncate text-sm font-medium group-hover:text-accent">{album.title}</h3>
    <p class="truncate text-xs text-text-muted">{album.artistName}</p>
    {#if album.userRating}
      <div class="mt-1 text-xs text-warning">
        {'★'.repeat(album.userRating)}{'☆'.repeat(5 - album.userRating)}
      </div>
    {/if}
    {#if album.userTags.length > 0}
      <div class="mt-1.5 flex flex-wrap gap-1">
        {#each album.userTags.slice(0, 3) as tag}
          <span class="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent">{tag}</span>
        {/each}
        {#if album.userTags.length > 3}
          <span class="text-[10px] text-text-dim">+{album.userTags.length - 3}</span>
        {/if}
      </div>
    {/if}
  </a>
</div>
