import type { AlbumOffer, Collector } from '../types/album.js';

/** Parse album detail data from a Bandcamp album page HTML */
export interface AlbumDetail {
  tags: string[];
  labelName?: string;
  labelUrl?: string;
  trackCount?: number;
  collectorCount?: number;
  collectors?: Collector[];
  releaseDate?: string;
  about?: string;
  credits?: string;
  digitalPrice?: number;
  digitalCurrency?: string;
  offers?: AlbumOffer[];
  labelLocation?: string;
  labelAbout?: string;
  tracks: AlbumTrackInfo[];
}

export interface AlbumTrackInfo {
  trackNumber: number;
  title: string;
  duration: number;
  streamUrl: string;
  /** Relative path to individual track page, e.g. "/track/aid-kit" */
  trackPath?: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTracks(data: Record<string, any>): AlbumTrackInfo[] {
  const tracks: AlbumTrackInfo[] = [];
  if (!Array.isArray(data.trackinfo)) return tracks;

  for (const t of data.trackinfo) {
    const file = t.file;
    if (!file) continue;
    const streamUrl = file['mp3-128'] || Object.values(file)[0] || '';
    if (streamUrl) {
      tracks.push({
        trackNumber: t.track_num ?? tracks.length + 1,
        title: t.title || `Track ${tracks.length + 1}`,
        duration: t.duration || 0,
        streamUrl: String(streamUrl),
        trackPath: t.title_link || undefined,
      });
    }
  }
  return tracks;
}

function extractDetail(data: Record<string, any>): AlbumDetail {
  return {
    tags: Array.isArray(data.tags) ? data.tags : [],
    trackCount: data.trackinfo?.length || undefined,
    releaseDate: data.album_release_date || data.current?.release_date || undefined,
    about: data.current?.about || undefined,
    credits: data.current?.credits || undefined,
    tracks: extractTracks(data),
  };
}

interface JsonLdData {
  collectorCount?: number;
  collectors?: Collector[];
  digitalPrice?: number;
  digitalCurrency?: string;
  offers?: AlbumOffer[];
  labelName?: string;
  labelLocation?: string;
  labelAbout?: string;
  releaseDate?: string;
  about?: string;
}

/** Extract structured data from JSON-LD block in page HTML */
function extractJsonLd(html: string): JsonLdData {
  const ldMatch = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!ldMatch) return {};

  try {
    const ld = JSON.parse(ldMatch[1]);
    const result: JsonLdData = {};

    // Sponsors / collectors
    if (Array.isArray(ld.sponsor) && ld.sponsor.length > 0) {
      result.collectorCount = ld.sponsor.length;
      const collectors: Collector[] = ld.sponsor
        .filter((s: any) => s.name && s.url)
        .map((s: any) => ({ name: String(s.name), url: String(s.url) }));
      if (collectors.length > 0) result.collectors = collectors;
    }

    // Album description
    if (ld.description) result.about = String(ld.description);

    // Release date
    if (ld.datePublished) result.releaseDate = String(ld.datePublished);

    // Publisher / label info
    const pub = ld.publisher;
    if (pub) {
      if (pub.name) result.labelName = String(pub.name);
      if (pub.description) result.labelAbout = String(pub.description);
      if (pub.foundingLocation?.name) result.labelLocation = String(pub.foundingLocation.name);
    }

    // Offers — can be on albumRelease[], inAlbum.albumRelease[] (track pages), or directly on LD
    const releases: any[] = [];
    if (Array.isArray(ld.albumRelease)) releases.push(...ld.albumRelease);
    else if (Array.isArray(ld.inAlbum?.albumRelease)) releases.push(...ld.inAlbum.albumRelease);
    if (releases.length === 0 && ld.offers) releases.push(ld);

    const offers: AlbumOffer[] = [];
    for (const rel of releases) {
      const offerObj = rel.offers;
      if (!offerObj) continue;
      // Skip discography bundles — they're not the album/track itself
      const relName = String(rel.name || '').toLowerCase();
      if (relName.includes('full digital discography')) continue;

      const offerList = Array.isArray(offerObj) ? offerObj : [offerObj];
      // musicReleaseFormat lives on the release, not the offer
      const format = rel.musicReleaseFormat || '';
      for (const o of offerList) {
        const soldOut =
          o.availability === 'SoldOut' ||
          o.availability === 'https://schema.org/SoldOut' ||
          String(o.availability).includes('SoldOut');
        const price = typeof o.price === 'number' ? o.price : parseFloat(o.price);
        const currency = o.priceCurrency || '';
        const formatName =
          rel.name || rel.description || format.replace('Format', '') || undefined;

        offers.push({
          format,
          formatName: formatName ? String(formatName) : undefined,
          price: isNaN(price) ? undefined : price,
          priceCurrency: currency || undefined,
          soldOut,
        });

        // Use the first digital offer as the album/track price (not discography)
        if (format === 'DigitalFormat' && !isNaN(price) && result.digitalPrice == null) {
          result.digitalPrice = price;
          result.digitalCurrency = currency || undefined;
        }
      }
    }
    if (offers.length > 0) result.offers = offers;

    return result;
  } catch {
    return {};
  }
}

/** Merge tralbum-extracted detail with JSON-LD data (JSON-LD fills gaps) */
function mergeJsonLd(detail: Partial<AlbumDetail>, ld: JsonLdData): AlbumDetail {
  return {
    tags: detail.tags ?? [],
    tracks: detail.tracks ?? [],
    trackCount: detail.trackCount,
    labelName: detail.labelName || ld.labelName,
    releaseDate: detail.releaseDate || ld.releaseDate,
    about: detail.about || ld.about,
    credits: detail.credits,
    collectorCount: ld.collectorCount,
    collectors: ld.collectors,
    digitalPrice: ld.digitalPrice,
    digitalCurrency: ld.digitalCurrency,
    offers: ld.offers,
    labelLocation: ld.labelLocation,
    labelAbout: ld.labelAbout,
  };
}

/**
 * Extract album data from a Bandcamp album page.
 * Tries two sources:
 * 1. data-tralbum attribute (HTML-entity-encoded JSON)
 * 2. var TralbumData script block
 */
export function parseAlbumPage(html: string): AlbumDetail | null {
  // Extract rich data from JSON-LD
  const ld = extractJsonLd(html);

  // Method 1: data-tralbum attribute (most common in modern Bandcamp pages)
  const attrMatch = html.match(/data-tralbum="([^"]+)"/);
  if (attrMatch) {
    try {
      const decoded = decodeHtmlEntities(attrMatch[1]);
      const data = JSON.parse(decoded);
      const detail = extractDetail(data);
      return mergeJsonLd(detail, ld);
    } catch {
      // Fall through to next method
    }
  }

  // Method 2: var TralbumData script block
  const scriptMatch = html.match(/var\s+TralbumData\s*=\s*(\{[\s\S]*?\});\s*\n/);
  if (scriptMatch) {
    try {
      const cleanJson = scriptMatch[1]
        .replace(/'/g, '"')
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      const data = JSON.parse(cleanJson);
      const detail = extractDetail(data);
      return mergeJsonLd(detail, ld);
    } catch {
      // Fall through to HTML extraction
    }
  }

  // Fallback: extract tags from HTML (no track data available)
  const tags: string[] = [];
  const tagMatches = html.matchAll(/class="tag"[^>]*>([^<]+)</g);
  for (const match of tagMatches) {
    tags.push(match[1].trim());
  }

  const labelMatch = html.match(/id="band-name-location"[^>]*>.*?<span[^>]*>([^<]+)/s);

  if (tags.length === 0 && !labelMatch && !ld.collectorCount && !ld.offers) return null;

  return mergeJsonLd(
    { tags, labelName: labelMatch?.[1]?.trim(), tracks: [] },
    ld,
  );
}

/** Parse a Bandcamp track page and return its collector count */
export function parseTrackPageCollectorCount(html: string): number | undefined {
  const { collectorCount } = extractJsonLd(html);
  return collectorCount;
}
