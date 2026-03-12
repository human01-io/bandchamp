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
  let rowEl: HTMLAnchorElement | undefined = $state();

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

  // Trigger enrichment when row scrolls into view, track visibility for priority
  $effect(() => {
    const el = rowEl;
    const needsEnrichment = !album.trackCount || !album.offers;
    if (!el || !needsEnrichment) return;

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
</script>

<a
  bind:this={rowEl}
  href="/collection/{encodeURIComponent(album.id)}"
  class="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-hover"
>
  {#if selectable}
    <button
      onclick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect?.(album.id); }}
      class="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]
             {selected ? 'border-accent bg-accent text-bg' : 'border-border text-transparent'}"
    >
      {#if selected}✓{/if}
    </button>
  {/if}

  {#if (album.coverArtUrlSmall || album.coverArtUrl) && !errored}
    <div class="relative h-10 w-10 shrink-0">
      {#if !loaded}
        <div class="absolute inset-0 animate-pulse rounded bg-bg-card"></div>
      {/if}
      <img
        src={album.coverArtUrlSmall || album.coverArtUrl}
        alt={album.title}
        loading="lazy"
        onload={handleLoad}
        onerror={handleError}
        class="h-10 w-10 shrink-0 rounded object-cover transition-opacity duration-200
               {loaded ? 'opacity-100' : 'opacity-0'}"
      />
    </div>
  {:else}
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-bg-card text-[8px] text-text-dim">
      N/A
    </div>
  {/if}

  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <span class="truncate text-sm font-medium group-hover:text-accent">{album.title}</span>
      <span
        class="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold leading-tight
               {isTrack ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'}"
      >
        {isTrack ? 'Track' : 'Album'}
      </span>
      {#if !isTrack && album.trackCount}
        <span class="shrink-0 text-[10px] text-text-dim">{album.trackCount}tr</span>
      {/if}
      {#if vinylOffer}
        <span class="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold leading-tight
                     {vinylOffer.soldOut ? 'bg-danger/20 text-danger' : 'bg-green-600/20 text-green-500'}">
          {vinylOffer.soldOut ? 'Vinyl Sold Out' : 'Vinyl'}
        </span>
      {/if}
    </div>
    <div class="truncate text-xs text-text-muted">{album.artistName}</div>
  </div>

  {#if album.digitalPrice != null}
    {#if album.digitalPrice === 0}
      <span class="hidden shrink-0 rounded px-1 py-0.5 text-[9px] font-bold tracking-wide bg-accent/20 text-accent sm:block">
        NYP
      </span>
    {:else}
      <span class="hidden shrink-0 text-[10px] font-semibold text-green-500 sm:block">
        {formatPrice(album.digitalPrice, album.digitalCurrency)}
      </span>
    {/if}
  {/if}

  {#if album.collectorCount}
    <span class="hidden shrink-0 text-[10px] text-text-dim sm:block">
      {formatCount(album.collectorCount)} fans
    </span>
  {/if}

  {#if album.userRating}
    <div class="shrink-0 text-xs text-warning">
      {'★'.repeat(album.userRating)}
    </div>
  {/if}

  {#if album.userTags.length > 0}
    <div class="hidden shrink-0 gap-1 sm:flex">
      {#each album.userTags.slice(0, 2) as tag}
        <span class="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent">{tag}</span>
      {/each}
    </div>
  {/if}

  {#if album.labelName}
    <span class="hidden shrink-0 text-xs text-text-dim lg:block">{album.labelName}</span>
  {/if}
</a>
