import { writable, derived } from 'svelte/store';
import type { WishlistItem } from '@bandchamp/shared';
import {
  getAllWishlistItems,
  putWishlistItem,
  deleteWishlistItem as dbDeleteWishlistItem,
  getWishlistByAlbum,
} from '@bandchamp/shared';

export const wishlistItems = writable<WishlistItem[]>([]);

export const wishlistCount = derived(wishlistItems, ($items) => $items.length);

export const wishlistByAlbumId = derived(wishlistItems, ($items) => {
  const map = new Map<string, WishlistItem>();
  for (const item of $items) {
    map.set(item.albumId, item);
  }
  return map;
});

export async function loadWishlist(): Promise<void> {
  const items = await getAllWishlistItems();
  wishlistItems.set(items);
}

export async function addToWishlist(albumId: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
  const item: WishlistItem = {
    id: `wish:${albumId}`,
    albumId,
    priority,
    addedAt: new Date().toISOString(),
  };
  await putWishlistItem(item);
  wishlistItems.update((items) => [...items.filter((i) => i.albumId !== albumId), item]);
}

export async function removeFromWishlist(albumId: string): Promise<void> {
  const id = `wish:${albumId}`;
  await dbDeleteWishlistItem(id);
  wishlistItems.update((items) => items.filter((i) => i.albumId !== albumId));
}

export async function updateWishlistItem(item: WishlistItem): Promise<void> {
  await putWishlistItem(item);
  wishlistItems.update((items) => items.map((i) => (i.id === item.id ? item : i)));
}
