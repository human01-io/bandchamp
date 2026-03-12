import { writable, derived } from 'svelte/store';
import type { Album, Artist } from '@bandchamp/shared';
import {
  getAllAlbums,
  getAllArtists,
  putAlbums,
  putArtists,
  putAlbum,
  deleteAlbum as dbDeleteAlbum,
} from '@bandchamp/shared';

export const albums = writable<Album[]>([]);
export const artists = writable<Artist[]>([]);
export const isLoading = writable(true);

export const albumCount = derived(albums, ($albums) => $albums.length);
export const artistCount = derived(artists, ($artists) => $artists.length);

export const albumsById = derived(albums, ($albums) => {
  const map = new Map<string, Album>();
  for (const album of $albums) {
    map.set(album.id, album);
  }
  return map;
});

export const allTags = derived(albums, ($albums) => {
  const tagCounts = new Map<string, number>();
  for (const album of $albums) {
    for (const tag of [...album.tags, ...album.userTags]) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
});

export const allLabels = derived(albums, ($albums) => {
  const labelCounts = new Map<string, number>();
  for (const album of $albums) {
    if (album.labelName) {
      labelCounts.set(album.labelName, (labelCounts.get(album.labelName) || 0) + 1);
    }
  }
  return Array.from(labelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
});

/** Load collection from IndexedDB into stores */
export async function loadCollection(): Promise<void> {
  isLoading.set(true);
  try {
    const [storedAlbums, storedArtists] = await Promise.all([getAllAlbums(), getAllArtists()]);
    albums.set(storedAlbums);
    artists.set(storedArtists);
  } finally {
    isLoading.set(false);
  }
}

/** Add albums to store and persist to IndexedDB */
export async function addAlbums(newAlbums: Album[], newArtists: Artist[]): Promise<void> {
  await Promise.all([putAlbums(newAlbums), putArtists(newArtists)]);

  albums.update((current) => {
    const existing = new Map(current.map((a) => [a.id, a]));
    for (const album of newAlbums) {
      existing.set(album.id, album);
    }
    return Array.from(existing.values());
  });

  artists.update((current) => {
    const existing = new Map(current.map((a) => [a.id, a]));
    for (const artist of newArtists) {
      const prev = existing.get(artist.id);
      if (prev) {
        const albumIds = new Set([...prev.albumIds, ...artist.albumIds]);
        existing.set(artist.id, { ...prev, albumIds: Array.from(albumIds) });
      } else {
        existing.set(artist.id, artist);
      }
    }
    return Array.from(existing.values());
  });
}

/** Update a single album in store and IndexedDB */
export async function updateAlbum(album: Album): Promise<void> {
  album.updatedAt = new Date().toISOString();
  await putAlbum(album);
  albums.update((current) => current.map((a) => (a.id === album.id ? album : a)));
}

/** Delete an album from store and IndexedDB */
export async function removeAlbum(id: string): Promise<void> {
  await dbDeleteAlbum(id);
  albums.update((current) => current.filter((a) => a.id !== id));
}
