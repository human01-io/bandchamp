import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Album } from '../types/album.js';
import type { Artist } from '../types/artist.js';
import type { WishlistItem } from '../types/wishlist.js';
import type { Track } from '../types/track.js';

export interface BandChampDB extends DBSchema {
  albums: {
    key: string;
    value: Album;
    indexes: {
      'by-artist': string;
      'by-tags': string;
      'by-user-tags': string;
      'by-rating': number;
      'by-purchase-date': string;
    };
  };
  artists: {
    key: string;
    value: Artist;
    indexes: {
      'by-name': string;
    };
  };
  wishlistItems: {
    key: string;
    value: WishlistItem;
    indexes: {
      'by-album': string;
      'by-priority': string;
    };
  };
  tracks: {
    key: string;
    value: Track;
    indexes: {
      'by-album': string;
    };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<BandChampDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BandChampDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BandChampDB>('bandchamp', 2, {
      upgrade(db) {
        // Albums store
        if (!db.objectStoreNames.contains('albums')) {
          const albumStore = db.createObjectStore('albums', { keyPath: 'id' });
          albumStore.createIndex('by-artist', 'artistId');
          albumStore.createIndex('by-tags', 'tags', { multiEntry: true });
          albumStore.createIndex('by-user-tags', 'userTags', { multiEntry: true });
          albumStore.createIndex('by-rating', 'userRating');
          albumStore.createIndex('by-purchase-date', 'purchaseDate');
        }

        // Artists store
        if (!db.objectStoreNames.contains('artists')) {
          const artistStore = db.createObjectStore('artists', { keyPath: 'id' });
          artistStore.createIndex('by-name', 'name');
        }

        // Wishlist store
        if (!db.objectStoreNames.contains('wishlistItems')) {
          const wishlistStore = db.createObjectStore('wishlistItems', { keyPath: 'id' });
          wishlistStore.createIndex('by-album', 'albumId');
          wishlistStore.createIndex('by-priority', 'priority');
        }

        // Tracks store (added in v2)
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('by-album', 'albumId');
        }

        // Meta store (key-value)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}
