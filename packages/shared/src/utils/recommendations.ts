import type { Album } from '../types/album.js';

export interface TagProfile {
  tag: string;
  count: number;
  weight: number;
}

export interface ArtistCluster {
  artistName: string;
  artistId: string;
  albumCount: number;
  tags: string[];
}

export interface Recommendation {
  type: 'tag' | 'artist' | 'label';
  reason: string;
  albums: Album[];
}

/** Build a taste profile from the user's collection */
export function buildTagProfile(albums: Album[]): TagProfile[] {
  const tagCounts = new Map<string, number>();
  const totalAlbums = albums.length || 1;

  for (const album of albums) {
    const allTags = [...new Set([...album.tags, ...album.userTags])];
    // Weight: rated albums count more
    const weight = album.userRating ? album.userRating / 3 : 1;
    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + weight);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({
      tag,
      count: Math.round(count),
      weight: count / totalAlbums,
    }))
    .sort((a, b) => b.weight - a.weight);
}

/** Find artists the user has multiple albums from */
export function findTopArtists(albums: Album[]): ArtistCluster[] {
  const artistMap = new Map<string, ArtistCluster>();

  for (const album of albums) {
    const existing = artistMap.get(album.artistId);
    if (existing) {
      existing.albumCount++;
      for (const tag of album.tags) {
        if (!existing.tags.includes(tag)) existing.tags.push(tag);
      }
    } else {
      artistMap.set(album.artistId, {
        artistName: album.artistName,
        artistId: album.artistId,
        albumCount: 1,
        tags: [...album.tags],
      });
    }
  }

  return Array.from(artistMap.values())
    .sort((a, b) => b.albumCount - a.albumCount);
}

/** Compute Jaccard similarity between two tag sets */
export function tagSimilarity(tagsA: string[], tagsB: string[]): number {
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Find albums similar to a given album (by tags) */
export function findSimilarAlbums(album: Album, collection: Album[], limit = 10): Album[] {
  const allTags = [...album.tags, ...album.userTags];

  return collection
    .filter((a) => a.id !== album.id)
    .map((a) => ({
      album: a,
      similarity: tagSimilarity(allTags, [...a.tags, ...a.userTags]),
    }))
    .filter((a) => a.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((a) => a.album);
}

/** Build "because you like [tag]" recommendations */
export function buildRecommendations(albums: Album[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const profile = buildTagProfile(albums);
  const topArtists = findTopArtists(albums);

  // Top tags (that the user has many albums for)
  for (const { tag, count } of profile.slice(0, 5)) {
    if (count < 3) continue;
    const tagAlbums = albums
      .filter((a) => a.tags.includes(tag) || a.userTags.includes(tag))
      .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
      .slice(0, 6);

    if (tagAlbums.length >= 2) {
      recs.push({
        type: 'tag',
        reason: `Because you like "${tag}"`,
        albums: tagAlbums,
      });
    }
  }

  // Top artists (with multiple albums)
  for (const artist of topArtists.slice(0, 3)) {
    if (artist.albumCount < 2) break;
    const artistAlbums = albums
      .filter((a) => a.artistId === artist.artistId)
      .sort((a, b) => (b.userRating || 0) - (a.userRating || 0));

    recs.push({
      type: 'artist',
      reason: `More from ${artist.artistName}`,
      albums: artistAlbums,
    });
  }

  // Top labels
  const labelCounts = new Map<string, Album[]>();
  for (const album of albums) {
    if (album.labelName) {
      const list = labelCounts.get(album.labelName) || [];
      list.push(album);
      labelCounts.set(album.labelName, list);
    }
  }
  const topLabels = Array.from(labelCounts.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3);

  for (const [label, labelAlbums] of topLabels) {
    if (labelAlbums.length < 2) continue;
    recs.push({
      type: 'label',
      reason: `From label "${label}"`,
      albums: labelAlbums.slice(0, 6),
    });
  }

  return recs;
}

/** Pick random albums from collection, optionally filtered */
export function digCrate(
  albums: Album[],
  count: number = 1,
  filter?: {
    tags?: string[];
    unratedOnly?: boolean;
  },
): Album[] {
  let pool = [...albums];

  if (filter?.tags?.length) {
    pool = pool.filter((a) =>
      filter.tags!.some((t) => a.tags.includes(t) || a.userTags.includes(t)),
    );
  }

  if (filter?.unratedOnly) {
    pool = pool.filter((a) => !a.userRating);
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
