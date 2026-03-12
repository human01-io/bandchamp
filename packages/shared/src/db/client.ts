import { getDB } from './schema.js';
import type { Album } from '../types/album.js';
import type { Artist } from '../types/artist.js';
import type { Track } from '../types/track.js';
import type { WishlistItem } from '../types/wishlist.js';

// ─── Albums ──────────────────────────────────────────────

export async function getAllAlbums(): Promise<Album[]> {
  const db = await getDB();
  return db.getAll('albums');
}

export async function getAlbum(id: string): Promise<Album | undefined> {
  const db = await getDB();
  return db.get('albums', id);
}

export async function putAlbum(album: Album): Promise<void> {
  const db = await getDB();
  await db.put('albums', album);
}

export async function putAlbums(albums: Album[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('albums', 'readwrite');
  await Promise.all([...albums.map((a) => tx.store.put(a)), tx.done]);
}

export async function deleteAlbum(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('albums', id);
}

export async function getAlbumsByArtist(artistId: string): Promise<Album[]> {
  const db = await getDB();
  return db.getAllFromIndex('albums', 'by-artist', artistId);
}

export async function getAlbumsByTag(tag: string): Promise<Album[]> {
  const db = await getDB();
  return db.getAllFromIndex('albums', 'by-tags', tag);
}

// ─── Artists ─────────────────────────────────────────────

export async function getAllArtists(): Promise<Artist[]> {
  const db = await getDB();
  return db.getAll('artists');
}

export async function getArtist(id: string): Promise<Artist | undefined> {
  const db = await getDB();
  return db.get('artists', id);
}

export async function putArtist(artist: Artist): Promise<void> {
  const db = await getDB();
  await db.put('artists', artist);
}

export async function putArtists(artists: Artist[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('artists', 'readwrite');
  await Promise.all([...artists.map((a) => tx.store.put(a)), tx.done]);
}

// ─── Wishlist ────────────────────────────────────────────

export async function getAllWishlistItems(): Promise<WishlistItem[]> {
  const db = await getDB();
  return db.getAll('wishlistItems');
}

export async function getWishlistItem(id: string): Promise<WishlistItem | undefined> {
  const db = await getDB();
  return db.get('wishlistItems', id);
}

export async function getWishlistByAlbum(albumId: string): Promise<WishlistItem | undefined> {
  const db = await getDB();
  const items = await db.getAllFromIndex('wishlistItems', 'by-album', albumId);
  return items[0];
}

export async function putWishlistItem(item: WishlistItem): Promise<void> {
  const db = await getDB();
  await db.put('wishlistItems', item);
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('wishlistItems', id);
}

// ─── Tracks ─────────────────────────────────────────────

export async function getTracksByAlbum(albumId: string): Promise<Track[]> {
  const db = await getDB();
  return db.getAllFromIndex('tracks', 'by-album', albumId);
}

export async function putTracks(tracks: Track[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tracks', 'readwrite');
  await Promise.all([...tracks.map((t) => tx.store.put(t)), tx.done]);
}

export async function putTrack(track: Track): Promise<void> {
  const db = await getDB();
  await db.put('tracks', track);
}

// ─── Meta ────────────────────────────────────────────────

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get('meta', key) as Promise<T | undefined>;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', value, key);
}

// ─── Bulk ────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx1 = db.transaction('albums', 'readwrite');
  await tx1.store.clear();
  await tx1.done;
  const tx2 = db.transaction('artists', 'readwrite');
  await tx2.store.clear();
  await tx2.done;
  const tx3 = db.transaction('wishlistItems', 'readwrite');
  await tx3.store.clear();
  await tx3.done;
  const tx4 = db.transaction('tracks', 'readwrite');
  await tx4.store.clear();
  await tx4.done;
  const tx5 = db.transaction('meta', 'readwrite');
  await tx5.store.clear();
  await tx5.done;
}
