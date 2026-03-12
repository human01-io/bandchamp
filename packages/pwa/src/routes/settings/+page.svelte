<script lang="ts">
  import { importCollection, importProgress, isImporting, imagePreloadProgress } from '$lib/stores/import';
  import { albumCount, artistCount, albums } from '$lib/stores/collection';
  import { wishlistCount, wishlistItems } from '$lib/stores/wishlist';
  import { clearAllData, getAllAlbums, getAllArtists, getAllWishlistItems, putAlbums, putArtists } from '@bandchamp/shared';
  import type { WishlistItem } from '@bandchamp/shared';
  import { loadCollection } from '$lib/stores/collection';
  import { loadWishlist, updateWishlistItem } from '$lib/stores/wishlist';
  import { offlineAudioEnabled, toggleOfflineAudio } from '$lib/stores/ui';

  let username = $state('');
  let showClearConfirm = $state(false);

  async function handleImport() {
    if (!username.trim()) return;
    await importCollection(username.trim());
  }

  async function exportData() {
    const [exportAlbums, artists, wishlist] = await Promise.all([
      getAllAlbums(),
      getAllArtists(),
      getAllWishlistItems(),
    ]);
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      albums: exportAlbums,
      artists,
      wishlist,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bandchamp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.albums) await putAlbums(data.albums);
        if (data.artists) await putArtists(data.artists);
        if (data.wishlist) {
          for (const item of data.wishlist as WishlistItem[]) {
            await updateWishlistItem(item);
          }
        }
        await loadCollection();
        await loadWishlist();
      } catch (err) {
        alert('Failed to import backup: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    input.click();
  }

  async function handleClearData() {
    await clearAllData();
    await loadCollection();
    await loadWishlist();
    showClearConfirm = false;
  }
</script>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
  <h1 class="mb-2 text-3xl font-bold">Settings</h1>
  <p class="mb-10 text-text-muted">Import and manage your collection</p>

  <!-- Collection Stats -->
  {#if $albumCount > 0}
    <div class="mb-10 flex flex-wrap gap-4">
      <div class="rounded-lg bg-bg-card px-5 py-4">
        <div class="text-2xl font-bold text-accent">{$albumCount}</div>
        <div class="text-sm text-text-muted">Albums</div>
      </div>
      <div class="rounded-lg bg-bg-card px-5 py-4">
        <div class="text-2xl font-bold text-accent">{$artistCount}</div>
        <div class="text-sm text-text-muted">Artists</div>
      </div>
      <div class="rounded-lg bg-bg-card px-5 py-4">
        <div class="text-2xl font-bold text-accent">{$wishlistCount}</div>
        <div class="text-sm text-text-muted">Wishlist</div>
      </div>
    </div>
  {/if}

  <!-- Import Section -->
  <section class="mb-6 rounded-xl border border-border bg-bg-card p-6">
    <h2 class="mb-1 text-lg font-semibold">Import from Bandcamp</h2>
    <p class="mb-6 text-sm text-text-muted">
      Enter your Bandcamp username to import your collection. Your collection must be public.
    </p>

    <form onsubmit={(e) => { e.preventDefault(); handleImport(); }} class="flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">
          bandcamp.com/
        </span>
        <input
          type="text"
          bind:value={username}
          placeholder="username"
          disabled={$isImporting}
          class="w-full rounded-lg border border-border bg-bg-input py-2.5 pl-[120px] pr-4 text-text
                 placeholder:text-text-dim focus:border-border-focus focus:outline-none
                 disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={$isImporting || !username.trim()}
        class="rounded-lg bg-accent px-6 py-2.5 font-medium text-bg transition-colors
               hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {$isImporting ? 'Importing...' : 'Import'}
      </button>
    </form>

    {#if $importProgress}
      <div class="mt-6">
        {#if $importProgress.status === 'fetching' || $importProgress.status === 'processing'}
          <div class="mb-2 flex items-center gap-3">
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
              {#if $importProgress.total}
                <div
                  class="h-full rounded-full bg-accent transition-all duration-300"
                  style="width: {Math.min(100, ($importProgress.fetched / $importProgress.total) * 100)}%"
                ></div>
              {:else}
                <div class="h-full w-1/3 animate-pulse rounded-full bg-accent"></div>
              {/if}
            </div>
            {#if $importProgress.total}
              <span class="text-sm text-text-muted">
                {$importProgress.fetched} / {$importProgress.total}
              </span>
            {/if}
          </div>
        {/if}

        <p
          class="text-sm"
          class:text-text-muted={$importProgress.status === 'fetching' || $importProgress.status === 'processing'}
          class:text-success={$importProgress.status === 'done'}
          class:text-danger={$importProgress.status === 'error'}
        >
          {$importProgress.message}
        </p>

        {#if $imagePreloadProgress && $imagePreloadProgress.loaded < $imagePreloadProgress.total}
          <div class="mt-4">
            <div class="mb-1 flex items-center gap-3">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                <div
                  class="h-full rounded-full bg-success transition-all duration-300"
                  style="width: {Math.round(($imagePreloadProgress.loaded / $imagePreloadProgress.total) * 100)}%"
                ></div>
              </div>
              <span class="shrink-0 text-xs text-text-muted">
                {$imagePreloadProgress.loaded}/{$imagePreloadProgress.total}
              </span>
            </div>
            <p class="text-xs text-text-muted">Caching cover art for offline use...</p>
          </div>
        {/if}

        {#if $importProgress.status === 'done'}
          <a
            href="/collection"
            class="mt-4 inline-block rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg
                   transition-colors hover:bg-accent-hover"
          >
            {#if $imagePreloadProgress && $imagePreloadProgress.loaded < $imagePreloadProgress.total}
              Browse Collection (covers still loading)
            {:else}
              View Collection &rarr;
            {/if}
          </a>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Data Management -->
  <section class="mb-6 rounded-xl border border-border bg-bg-card p-6">
    <h2 class="mb-1 text-lg font-semibold">Data Management</h2>
    <p class="mb-6 text-sm text-text-muted">
      Export your data as a backup or import from a previous backup.
      All data is stored locally in your browser.
    </p>

    <div class="flex flex-wrap gap-3">
      <button
        onclick={exportData}
        class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted
               transition-colors hover:border-border-focus hover:text-text"
      >
        Export Backup (JSON)
      </button>
      <button
        onclick={importData}
        class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted
               transition-colors hover:border-border-focus hover:text-text"
      >
        Import Backup
      </button>
    </div>
  </section>

  <!-- Playback Settings -->
  <section class="mb-6 rounded-xl border border-border bg-bg-card p-6">
    <h2 class="mb-1 text-lg font-semibold">Playback</h2>
    <p class="mb-6 text-sm text-text-muted">
      Control how audio streaming and caching works.
    </p>

    <label class="flex cursor-pointer items-center justify-between">
      <div>
        <div class="text-sm font-medium">Cache audio for offline</div>
        <div class="text-xs text-text-muted">
          When you play an album, all its tracks will be saved for offline listening.
          Uses more storage.
        </div>
      </div>
      <button
        onclick={toggleOfflineAudio}
        role="switch"
        aria-checked={$offlineAudioEnabled}
        class="relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors
               {$offlineAudioEnabled ? 'bg-accent' : 'bg-border'}"
      >
        <span
          class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform
                 {$offlineAudioEnabled ? 'translate-x-5' : 'translate-x-0'}"
        ></span>
      </button>
    </label>
  </section>

  <!-- Danger Zone -->
  {#if $albumCount > 0}
    <section class="rounded-xl border border-danger/30 bg-bg-card p-6">
      <h2 class="mb-1 text-lg font-semibold text-danger">Danger Zone</h2>
      <p class="mb-6 text-sm text-text-muted">
        This will permanently delete all your collection data, ratings, tags, and wishlist items.
      </p>

      {#if showClearConfirm}
        <div class="flex items-center gap-3">
          <span class="text-sm text-danger">Are you sure?</span>
          <button
            onclick={handleClearData}
            class="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white
                   transition-colors hover:bg-danger/80"
          >
            Yes, delete everything
          </button>
          <button
            onclick={() => (showClearConfirm = false)}
            class="rounded-lg border border-border px-4 py-2 text-sm text-text-muted"
          >
            Cancel
          </button>
        </div>
      {:else}
        <button
          onclick={() => (showClearConfirm = true)}
          class="rounded-lg border border-danger/50 px-4 py-2 text-sm text-danger
                 transition-colors hover:bg-danger/10"
        >
          Clear All Data
        </button>
      {/if}
    </section>
  {/if}
</div>
