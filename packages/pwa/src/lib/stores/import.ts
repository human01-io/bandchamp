import { writable, get } from 'svelte/store';
import {
  extractFanId,
  extractCollectionCount,
  extractInitialCollection,
  collectionItemToAlbum,
  fetchCollection,
  extractArtists,
  type ImportProgress,
  type BandcampCollectionResponse,
} from '@bandchamp/shared';
import { addAlbums } from './collection';

export const importProgress = writable<ImportProgress | null>(null);
export const isImporting = writable(false);

// Image preloading progress during import
export const imagePreloadProgress = writable<{ loaded: number; total: number } | null>(null);

/** Preload cover art images so they get cached by the service worker */
function preloadImages(urls: string[]) {
  const current = get(imagePreloadProgress);
  const prevTotal = current?.total ?? 0;
  const prevLoaded = current?.loaded ?? 0;
  imagePreloadProgress.set({ loaded: prevLoaded, total: prevTotal + urls.length });

  for (const url of urls) {
    if (!url) {
      imagePreloadProgress.update((p) => p && ({ loaded: p.loaded + 1, total: p.total }));
      continue;
    }
    const img = new Image();
    img.src = url;
    const settle = () => {
      imagePreloadProgress.update((p) => p && ({ loaded: p.loaded + 1, total: p.total }));
    };
    img.onload = settle;
    img.onerror = settle;
  }
}

async function proxyFetch(url: string, body?: string): Promise<string> {
  if (body) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method: 'POST', payload: body }),
    });
    return res.text();
  }

  const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  return res.text();
}

async function proxyFetchJson(url: string, body: string): Promise<BandcampCollectionResponse> {
  const text = await proxyFetch(url, body);
  return JSON.parse(text);
}

export async function importCollection(username: string): Promise<void> {
  if (get(isImporting)) return;
  isImporting.set(true);

  try {
    importProgress.set({
      fetched: 0,
      total: null,
      status: 'fetching',
      message: `Loading profile for ${username}...`,
    });

    // Step 1: Fetch the profile page to get fan_id
    const profileHtml = await proxyFetch(`https://bandcamp.com/${username}`);
    const fanId = extractFanId(profileHtml);

    if (!fanId) {
      importProgress.set({
        fetched: 0,
        total: null,
        status: 'error',
        message: `Could not find collection for "${username}". Make sure the username is correct and the collection is public.`,
      });
      return;
    }

    const collectionCount = extractCollectionCount(profileHtml);
    imagePreloadProgress.set(null);
    importProgress.set({
      fetched: 0,
      total: collectionCount,
      status: 'fetching',
      message: 'Starting collection import...',
    });

    // Step 2: Extract initial batch from profile page HTML
    const initial = extractInitialCollection(profileHtml);
    let totalFetched = 0;
    let lastToken: string | undefined;

    if (initial && initial.items.length > 0) {
      const initialAlbums = initial.items.map(collectionItemToAlbum);
      const initialArtists = extractArtists(initialAlbums);
      await addAlbums(initialAlbums, initialArtists);
      preloadImages(initialAlbums.map((a) => a.coverArtUrl));
      totalFetched = initialAlbums.length;
      lastToken = initial.lastToken;

      importProgress.set({
        fetched: totalFetched,
        total: collectionCount,
        status: 'fetching',
        message: `Fetched ${totalFetched} items`,
      });

      if (!initial.hasMore) {
        importProgress.set({
          fetched: totalFetched,
          total: totalFetched,
          status: 'done',
          message: `Import complete! ${totalFetched} items imported.`,
        });
        return;
      }
    }

    // Step 3: Paginate through remaining collection items
    const generator = fetchCollection(fanId, proxyFetchJson, (progress) => {
      importProgress.set({
        ...progress,
        fetched: totalFetched + progress.fetched,
        total: collectionCount ?? progress.total,
      });
    }, lastToken);

    for await (const albumBatch of generator) {
      const artistBatch = extractArtists(albumBatch);
      await addAlbums(albumBatch, artistBatch);
      preloadImages(albumBatch.map((a) => a.coverArtUrl));
      totalFetched += albumBatch.length;
    }

    const currentProgress = get(importProgress);
    importProgress.set({
      fetched: currentProgress?.fetched ?? 0,
      total: currentProgress?.fetched ?? 0,
      status: 'done',
      message: `Import complete! ${currentProgress?.fetched ?? 0} items imported.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    importProgress.set({
      fetched: 0,
      total: null,
      status: 'error',
      message: `Error: ${message}`,
    });
  } finally {
    isImporting.set(false);
  }
}
