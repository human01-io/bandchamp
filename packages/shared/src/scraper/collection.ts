import type { Album } from '../types/album.js';
import type { Artist } from '../types/artist.js';
import { bandcampLimiter } from './rate-limiter.js';

export interface BandcampCollectionItem {
  sale_item_id: number;
  sale_item_type: string;
  band_name: string;
  item_title: string;
  item_url: string;
  item_art_url?: string;
  item_art_id?: number;
  album_id?: number;
  band_id?: number;
  purchased?: string;
  token: string;
  tralbum_type: string;
  featured_track_title?: string;
  also_collected_count?: number;
}

export interface BandcampCollectionResponse {
  items: BandcampCollectionItem[];
  more_available: boolean;
  last_token: string;
  redownload_urls: Record<string, string>;
}

export interface ImportProgress {
  fetched: number;
  total: number | null;
  status: 'fetching' | 'processing' | 'done' | 'error';
  message: string;
}

/** Extract fan_id from a Bandcamp profile page HTML */
export function extractFanId(html: string): string | null {
  // Bandcamp embeds fan data in a data-blob attribute or pagedata script
  const blobMatch = html.match(/data-blob="([^"]+)"/);
  if (blobMatch) {
    try {
      const decoded = blobMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const blob = JSON.parse(decoded);
      if (blob.fan_data?.fan_id) return String(blob.fan_data.fan_id);
    } catch {
      // fall through
    }
  }

  // Alternative: look for fan_id in pagedata
  const fanIdMatch = html.match(/"fan_id"\s*:\s*(\d+)/);
  if (fanIdMatch) return fanIdMatch[1];

  return null;
}

/** Extract collection count from profile page HTML */
export function extractCollectionCount(html: string): number | null {
  const match = html.match(/collection-count[^>]*>\s*(\d+)/);
  if (match) return parseInt(match[1], 10);

  const blobMatch = html.match(/data-blob="([^"]+)"/);
  if (blobMatch) {
    try {
      const decoded = blobMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const blob = JSON.parse(decoded);
      if (blob.collection_count != null) return blob.collection_count;
    } catch {
      // fall through
    }
  }
  return null;
}

/** Parse the data-blob JSON from a Bandcamp profile page */
function parseDataBlob(html: string): Record<string, any> | null {
  const blobMatch = html.match(/data-blob="([^"]+)"/);
  if (!blobMatch) return null;
  try {
    const decoded = blobMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/** Extract the initial collection items and last_token from profile page HTML */
export function extractInitialCollection(html: string): {
  items: BandcampCollectionItem[];
  lastToken: string;
  hasMore: boolean;
} | null {
  const blob = parseDataBlob(html);
  if (!blob) return null;

  const collectionData = blob.collection_data;
  const itemCache = blob.item_cache?.collection;
  if (!collectionData || !itemCache) return null;

  const sequence: string[] = collectionData.sequence || [];
  const items: BandcampCollectionItem[] = [];

  for (const key of sequence) {
    const cached = itemCache[key];
    if (cached) {
      items.push(cached as BandcampCollectionItem);
    }
  }

  return {
    items,
    lastToken: collectionData.last_token,
    hasMore: items.length < (collectionData.item_count || 0),
  };
}

/** Convert a Bandcamp collection item to our Album type */
export function collectionItemToAlbum(item: BandcampCollectionItem): Album {
  const url = item.item_url.startsWith('http')
    ? item.item_url
    : `https://bandcamp.com${item.item_url}`;

  const id = url
    .replace(/https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/[^a-zA-Z0-9-]/g, '_');

  const artistId = item.band_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const now = new Date().toISOString();

  // Bandcamp sometimes omits item_art_url but provides item_art_id.
  // The CDN URL can be constructed from the art ID.
  let artBase = item.item_art_url;
  if (!artBase && item.item_art_id) {
    artBase = `https://f4.bcbits.com/img/a${item.item_art_id}_10.jpg`;
  }

  return {
    id,
    bandcampUrl: url,
    title: item.item_title,
    artistId,
    artistName: item.band_name,
    coverArtUrl: artBase
      ? artBase.replace(/_\d+\./, '_10.')
      : '',
    coverArtUrlSmall: artBase
      ? artBase.replace(/_\d+\./, '_42.')
      : '',
    purchaseDate: item.purchased || undefined,
    itemType: item.tralbum_type === 't' ? 'track' : 'album',
    collectorCount: item.also_collected_count || undefined,
    tags: [],
    userTags: [],
    importedAt: now,
    updatedAt: now,
  };
}

/** Extract unique artists from a set of albums */
export function extractArtists(albums: Album[]): Artist[] {
  const artistMap = new Map<string, Artist>();

  for (const album of albums) {
    const existing = artistMap.get(album.artistId);
    if (existing) {
      if (!existing.albumIds.includes(album.id)) {
        existing.albumIds.push(album.id);
      }
    } else {
      artistMap.set(album.artistId, {
        id: album.artistId,
        name: album.artistName,
        bandcampUrl: '',
        albumIds: [album.id],
      });
    }
  }

  return Array.from(artistMap.values());
}

/**
 * Fetch a Bandcamp collection page by page.
 * `fetchFn` is an abstraction over the actual HTTP fetch (allows proxy usage).
 * `initialToken` should come from the profile page's collection_data.last_token.
 */
export async function* fetchCollection(
  fanId: string,
  fetchFn: (url: string, body: string) => Promise<BandcampCollectionResponse>,
  onProgress?: (progress: ImportProgress) => void,
  initialToken?: string,
): AsyncGenerator<Album[]> {
  let lastToken = initialToken || `${Math.floor(Date.now() / 1000)}:0:a::`;
  let hasMore = true;
  let totalFetched = 0;

  while (hasMore) {
    const body = JSON.stringify({
      fan_id: Number(fanId),
      older_than_token: lastToken,
      count: 20,
    });

    onProgress?.({
      fetched: totalFetched,
      total: null,
      status: 'fetching',
      message: `Fetching items ${totalFetched + 1}...`,
    });

    const response = await bandcampLimiter.schedule(() =>
      fetchFn('https://bandcamp.com/api/fancollection/1/collection_items', body),
    );

    if (!response.items || !Array.isArray(response.items)) {
      throw new Error(
        (response as any).error
          ? 'Bandcamp API returned an error — the fan ID may be invalid or the profile may be private'
          : 'Unexpected response format from Bandcamp API',
      );
    }

    const albums = response.items.map(collectionItemToAlbum);
    totalFetched += albums.length;

    onProgress?.({
      fetched: totalFetched,
      total: null,
      status: 'fetching',
      message: `Fetched ${totalFetched} items`,
    });

    yield albums;

    hasMore = response.more_available;
    lastToken = response.last_token;
  }

  onProgress?.({
    fetched: totalFetched,
    total: totalFetched,
    status: 'done',
    message: `Import complete: ${totalFetched} items`,
  });
}
