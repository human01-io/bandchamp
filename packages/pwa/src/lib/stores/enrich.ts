import { parseAlbumPage, putTracks, getTracksByAlbum, type Album } from '@bandchamp/shared';
import { updateAlbum } from './collection';

// ─── State ───────────────────────────────────────────────

/** Albums already enriched, in-flight, or known to have data — survives navigation */
const done = new Set<string>();

/** Visible album IDs (currently in viewport) */
const visible = new Set<string>();

/** Priority queue — items are sorted so visible-first, then by insertion order */
interface QueueEntry {
  album: Album;
  order: number;
}
let nextOrder = 0;
const queue = new Map<string, QueueEntry>();

// ─── Rate limiter ────────────────────────────────────────

let active = 0;
const MAX_CONCURRENT = 2;
const MIN_INTERVAL = 400;
let lastFetchTime = 0;

function drain() {
  while (active < MAX_CONCURRENT && queue.size > 0) {
    const next = pickNext();
    if (!next) break;

    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL - (now - lastFetchTime));

    if (wait === 0) {
      startFetch(next);
    } else {
      setTimeout(() => startFetch(next), wait);
      break;
    }
  }
}

function pickNext(): QueueEntry | undefined {
  let best: QueueEntry | undefined;
  for (const entry of queue.values()) {
    const entryVisible = visible.has(entry.album.id);
    const bestVisible = best ? visible.has(best.album.id) : false;

    if (!best) {
      best = entry;
    } else if (entryVisible && !bestVisible) {
      best = entry;
    } else if (entryVisible === bestVisible && entry.order < best.order) {
      best = entry;
    }
  }
  if (best) {
    queue.delete(best.album.id);
  }
  return best;
}

function startFetch(entry: QueueEntry) {
  active++;
  lastFetchTime = Date.now();
  fetchAlbumDetail(entry.album).finally(() => {
    active--;
    drain();
  });
}

// ─── Fetch logic ─────────────────────────────────────────

async function fetchAlbumDetail(album: Album): Promise<void> {
  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(album.bandcampUrl)}`);
    const html = await res.text();
    const detail = parseAlbumPage(html);
    if (!detail) return;

    const updates: Partial<Album> = {};
    if (detail.trackCount && !album.trackCount) updates.trackCount = detail.trackCount;
    if (detail.collectorCount && !album.collectorCount) updates.collectorCount = detail.collectorCount;
    if (detail.collectors?.length && !album.collectors?.length) updates.collectors = detail.collectors;
    if (detail.tags?.length && !album.tags.length) updates.tags = detail.tags;
    if (detail.labelName && !album.labelName) updates.labelName = detail.labelName;
    if (detail.releaseDate && !album.releaseDate) updates.releaseDate = detail.releaseDate;
    if (detail.about && !album.about) updates.about = detail.about;
    if (detail.credits && !album.credits) updates.credits = detail.credits;
    if (detail.digitalPrice != null && album.digitalPrice == null) updates.digitalPrice = detail.digitalPrice;
    if (detail.digitalCurrency && !album.digitalCurrency) updates.digitalCurrency = detail.digitalCurrency;
    if (detail.offers?.length && !album.offers?.length) updates.offers = detail.offers;
    if (detail.labelLocation && !album.labelLocation) updates.labelLocation = detail.labelLocation;
    if (detail.labelAbout && !album.labelAbout) updates.labelAbout = detail.labelAbout;

    if (Object.keys(updates).length > 0) {
      updateAlbum({ ...album, ...updates });
    }

    // Cache tracks so playback is instant
    if (detail.tracks.length > 0) {
      const existing = await getTracksByAlbum(album.id);
      if (existing.length === 0) {
        const tracks = detail.tracks.map((t) => ({
          id: `${album.id}-${t.trackNumber}`,
          albumId: album.id,
          trackNumber: t.trackNumber,
          title: t.title,
          duration: t.duration,
          streamUrl: t.streamUrl,
          trackPath: t.trackPath,
        }));
        await putTracks(tracks);
      }
    }
  } catch {
    // Silently skip failed enrichments
  }
}

// ─── Public API ──────────────────────────────────────────

/** Mark an album as already enriched (e.g. loaded from DB with trackCount) */
export function markEnriched(id: string): void {
  done.add(id);
}

/** Queue enrichment for an album (called when card enters viewport) */
export function enrichAlbum(album: Album): void {
  if ((album.trackCount && album.offers) || done.has(album.id)) return;
  done.add(album.id);
  visible.add(album.id);

  queue.set(album.id, { album, order: nextOrder++ });
  drain();
}

/** Boost priority — move a queued album to the front (re-entered viewport) */
export function boostAlbum(id: string): void {
  visible.add(id);
}

/** Deprioritize — album left viewport, let visible ones go first */
export function deprioritizeAlbum(id: string): void {
  visible.delete(id);
}
