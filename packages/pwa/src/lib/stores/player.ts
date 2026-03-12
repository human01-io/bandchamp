import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { offlineAudioEnabled } from './ui';
import { updateAlbum } from './collection';
import {
  getTracksByAlbum,
  putTracks,
  putTrack,
  parseAlbumPage,
  type Album,
  type Track,
} from '@bandchamp/shared';

export interface QueueTrack extends Track {
  albumTitle: string;
  artistName: string;
  coverArtUrl: string;
}

export interface PlayerState {
  currentTrack: QueueTrack | null;
  queue: QueueTrack[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeat: 'off' | 'all' | 'one';
  shuffle: boolean;
  isLoading: boolean;
}

const initialState: PlayerState = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: browser ? parseFloat(localStorage.getItem('bandchamp-volume') ?? '0.8') : 0.8,
  repeat: 'off',
  shuffle: false,
  isLoading: false,
};

export const playerState = writable<PlayerState>({ ...initialState });

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.volume = get(playerState).volume;

    audio.addEventListener('timeupdate', () => {
      playerState.update((s) => ({ ...s, currentTime: audio!.currentTime }));
    });

    audio.addEventListener('loadedmetadata', () => {
      playerState.update((s) => ({ ...s, duration: audio!.duration }));
    });

    audio.addEventListener('ended', () => {
      next();
    });

    audio.addEventListener('error', () => {
      const state = get(playerState);
      if (state.currentTrack) {
        tryRefreshStream(state.currentTrack);
      }
    });

    audio.addEventListener('playing', () => {
      playerState.update((s) => ({ ...s, isPlaying: true }));
    });

    audio.addEventListener('pause', () => {
      playerState.update((s) => ({ ...s, isPlaying: false }));
    });
  }
  return audio;
}

async function proxyFetch(url: string): Promise<string> {
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  return res.text();
}

async function tryRefreshStream(track: QueueTrack) {
  try {
    const refreshUrl = `https://bandcamp.com/api/stream/1/refresh?url=${encodeURIComponent(track.streamUrl)}`;
    const text = await proxyFetch(refreshUrl);
    const data = JSON.parse(text);
    if (data.url) {
      const oldUrl = track.streamUrl;
      const newUrl = data.url;

      // Update track with new URL
      const updated: QueueTrack = { ...track, streamUrl: newUrl };
      playerState.update((s) => {
        const queue = [...s.queue];
        queue[s.queueIndex] = updated;
        return { ...s, currentTrack: updated, queue };
      });

      // Persist refreshed URL to IndexedDB
      await putTrack({ ...track, streamUrl: newUrl });

      // Re-key the audio cache so offline playback uses the new URL
      await migrateAudioCache(oldUrl, newUrl);

      // Retry playback
      const el = getAudio();
      el.src = newUrl;
      await el.play();
      return;
    }
  } catch {
    // Refresh failed
  }
  // Skip to next track if refresh fails
  next();
}

/** Check if a stream URL is likely expired based on its ts= parameter */
function isStreamExpired(url: string): boolean {
  try {
    const parsed = new URL(url);
    const ts = parsed.searchParams.get('ts');
    if (!ts) return false;
    // Bandcamp stream URLs typically expire after ~3 hours
    const issued = parseInt(ts, 10) * 1000;
    return Date.now() - issued > 3 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Proactively refresh a track's stream URL if it looks stale. Returns the (possibly updated) track. */
async function ensureFreshUrl(track: QueueTrack): Promise<QueueTrack> {
  // If audio is cached offline, skip refresh — cached bytes don't expire
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cached = await cache.match(track.streamUrl);
    if (cached) return track;
  } catch {
    // No cache available, continue with refresh check
  }

  if (!isStreamExpired(track.streamUrl)) return track;

  try {
    const refreshUrl = `https://bandcamp.com/api/stream/1/refresh?url=${encodeURIComponent(track.streamUrl)}`;
    const text = await proxyFetch(refreshUrl);
    const data = JSON.parse(text);
    if (data.url) {
      const updated = { ...track, streamUrl: data.url };
      await putTrack({ id: track.id, albumId: track.albumId, trackNumber: track.trackNumber, title: track.title, duration: track.duration, streamUrl: data.url });
      return updated;
    }
  } catch {
    // Refresh failed, use existing URL and hope for the best
  }
  return track;
}

/** Move a cached audio response from an old (expired) URL to the new (refreshed) URL */
async function migrateAudioCache(oldUrl: string, newUrl: string) {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cached = await cache.match(oldUrl);
    if (cached) {
      await cache.put(newUrl, cached);
      await cache.delete(oldUrl);
    }
  } catch {
    // Cache API unavailable or entry doesn't exist
  }
}

async function loadTrackAndPlay(track: QueueTrack) {
  // Proactively refresh if the URL looks stale (avoids fail-then-retry delay)
  const fresh = await ensureFreshUrl(track);

  // Update queue if URL changed
  if (fresh.streamUrl !== track.streamUrl) {
    playerState.update((s) => {
      const queue = [...s.queue];
      const idx = queue.findIndex((t) => t.id === fresh.id);
      if (idx >= 0) queue[idx] = fresh;
      return { ...s, queue };
    });
  }

  const el = getAudio();
  el.src = fresh.streamUrl;
  playerState.update((s) => ({
    ...s,
    currentTrack: fresh,
    currentTime: 0,
    duration: 0,
  }));
  updateMediaSession(fresh);

  try {
    await el.play();
  } catch {
    // Browser may reject play() if media isn't ready yet; the error handler
    // on the audio element will trigger tryRefreshStream if needed.
  }
}

function updateMediaSession(track: QueueTrack) {
  if (!browser || !('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artistName,
    album: track.albumTitle,
    artwork: track.coverArtUrl
      ? [{ src: track.coverArtUrl, sizes: '300x300', type: 'image/jpeg' }]
      : [],
  });
  navigator.mediaSession.setActionHandler('play', () => play());
  navigator.mediaSession.setActionHandler('pause', () => pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => prev());
  navigator.mediaSession.setActionHandler('nexttrack', () => next());
}

// ─── Offline Audio Caching ───────────────────────────────

const AUDIO_CACHE_NAME = 'bandchamp-audio';

/** Preload all stream URLs into the Cache API for offline playback */
async function cacheTracksForOffline(tracks: Track[]) {
  if (!browser || !get(offlineAudioEnabled)) return;

  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    for (const track of tracks) {
      if (!track.streamUrl) continue;
      const cached = await cache.match(track.streamUrl);
      if (!cached) {
        try {
          const response = await fetch(track.streamUrl, { mode: 'no-cors' });
          await cache.put(track.streamUrl, response);
        } catch {
          // Skip failed fetches silently
        }
      }
    }
  } catch {
    // Cache API unavailable
  }
}

// ─── Public API ──────────────────────────────────────────

export async function playAlbum(album: Album, startTrackIndex = 0) {
  playerState.update((s) => ({ ...s, isLoading: true }));

  try {
    // Check cache first
    let tracks = await getTracksByAlbum(album.id);

    if (tracks.length === 0) {
      // Fetch and parse the album page
      const html = await proxyFetch(album.bandcampUrl);
      const detail = parseAlbumPage(html);

      // Enrich album with detail metadata regardless of track availability
      if (detail) {
        const enriched: Partial<Album> = {};
        if (detail.trackCount) enriched.trackCount = detail.trackCount;
        if (detail.collectorCount) enriched.collectorCount = detail.collectorCount;
        if (detail.collectors?.length) enriched.collectors = detail.collectors;
        if (detail.about) enriched.about = detail.about;
        if (detail.credits) enriched.credits = detail.credits;
        if (detail.digitalPrice != null) enriched.digitalPrice = detail.digitalPrice;
        if (detail.digitalCurrency) enriched.digitalCurrency = detail.digitalCurrency;
        if (detail.offers?.length) enriched.offers = detail.offers;
        if (detail.labelLocation) enriched.labelLocation = detail.labelLocation;
        if (detail.labelAbout) enriched.labelAbout = detail.labelAbout;
        if (detail.tags?.length && !album.tags.length) enriched.tags = detail.tags;
        if (detail.labelName && !album.labelName) enriched.labelName = detail.labelName;
        if (detail.releaseDate && !album.releaseDate) enriched.releaseDate = detail.releaseDate;
        if (Object.keys(enriched).length > 0) {
          updateAlbum({ ...album, ...enriched });
        }
      }

      if (!detail || detail.tracks.length === 0) {
        playerState.update((s) => ({ ...s, isLoading: false }));
        return;
      }

      // Convert to Track objects and cache
      tracks = detail.tracks.map((t) => ({
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

    // Build queue with album metadata
    const queue: QueueTrack[] = tracks
      .sort((a, b) => a.trackNumber - b.trackNumber)
      .map((t) => ({
        ...t,
        albumTitle: album.title,
        artistName: album.artistName,
        coverArtUrl: album.coverArtUrl,
      }));

    const index = Math.min(startTrackIndex, queue.length - 1);

    playerState.update((s) => ({
      ...s,
      queue,
      queueIndex: index,
      isLoading: false,
    }));

    await loadTrackAndPlay(queue[index]);

    // Cache all tracks for offline in the background
    cacheTracksForOffline(tracks);
  } catch {
    playerState.update((s) => ({ ...s, isLoading: false }));
  }
}

export async function playTrack(track: QueueTrack) {
  const state = get(playerState);
  const idx = state.queue.findIndex((t) => t.id === track.id);
  if (idx >= 0) {
    playerState.update((s) => ({ ...s, queueIndex: idx }));
    await loadTrackAndPlay(track);
  }
}

export function play() {
  getAudio().play().catch(() => {});
}

export function pause() {
  getAudio().pause();
}

export function togglePlayPause() {
  const el = getAudio();
  if (el.paused) el.play().catch(() => {});
  else el.pause();
}

export async function next() {
  const state = get(playerState);
  if (state.queue.length === 0) return;

  let nextIndex: number;

  if (state.repeat === 'one') {
    nextIndex = state.queueIndex;
  } else if (state.shuffle) {
    nextIndex = Math.floor(Math.random() * state.queue.length);
  } else if (state.queueIndex < state.queue.length - 1) {
    nextIndex = state.queueIndex + 1;
  } else if (state.repeat === 'all') {
    nextIndex = 0;
  } else {
    // End of queue, stop
    pause();
    return;
  }

  playerState.update((s) => ({ ...s, queueIndex: nextIndex }));
  await loadTrackAndPlay(state.queue[nextIndex]);
}

export async function prev() {
  const state = get(playerState);
  if (state.queue.length === 0) return;

  // If past 3 seconds, restart current track
  if (getAudio().currentTime > 3) {
    getAudio().currentTime = 0;
    return;
  }

  const prevIndex = state.queueIndex > 0
    ? state.queueIndex - 1
    : state.repeat === 'all' ? state.queue.length - 1 : 0;

  playerState.update((s) => ({ ...s, queueIndex: prevIndex }));
  await loadTrackAndPlay(state.queue[prevIndex]);
}

export function seek(time: number) {
  getAudio().currentTime = time;
}

export function setVolume(v: number) {
  const vol = Math.max(0, Math.min(1, v));
  getAudio().volume = vol;
  playerState.update((s) => ({ ...s, volume: vol }));
  if (browser) localStorage.setItem('bandchamp-volume', String(vol));
}

export function toggleShuffle() {
  playerState.update((s) => ({ ...s, shuffle: !s.shuffle }));
}

export function cycleRepeat() {
  playerState.update((s) => ({
    ...s,
    repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
  }));
}

export function stopPlayer() {
  if (audio) {
    audio.pause();
    audio.src = '';
  }
  playerState.set({ ...initialState });
}
