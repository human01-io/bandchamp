import { writable, derived } from 'svelte/store';
import { albums } from './collection';
import type { Album } from '@bandchamp/shared';

export type SortField = 'title' | 'artist' | 'dateAdded' | 'dateReleased' | 'rating';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export interface FilterState {
  search: string;
  tags: string[];
  userTags: string[];
  artists: string[];
  labels: string[];
  minRating: number;
  hasRating: boolean | null;
  sortBy: SortField;
  sortDir: SortDirection;
  viewMode: ViewMode;
}

const defaultFilters: FilterState = {
  search: '',
  tags: [],
  userTags: [],
  artists: [],
  labels: [],
  minRating: 0,
  hasRating: null,
  sortBy: 'dateAdded',
  sortDir: 'desc',
  viewMode: 'grid',
};

export const filters = writable<FilterState>({ ...defaultFilters });

export function resetFilters() {
  filters.set({ ...defaultFilters });
}

export function setSearch(query: string) {
  filters.update((f) => ({ ...f, search: query }));
}

export function toggleTag(tag: string) {
  filters.update((f) => ({
    ...f,
    tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
  }));
}

export function toggleUserTag(tag: string) {
  filters.update((f) => ({
    ...f,
    userTags: f.userTags.includes(tag)
      ? f.userTags.filter((t) => t !== tag)
      : [...f.userTags, tag],
  }));
}

export function toggleArtist(artist: string) {
  filters.update((f) => ({
    ...f,
    artists: f.artists.includes(artist)
      ? f.artists.filter((a) => a !== artist)
      : [...f.artists, artist],
  }));
}

export function toggleLabel(label: string) {
  filters.update((f) => ({
    ...f,
    labels: f.labels.includes(label)
      ? f.labels.filter((l) => l !== label)
      : [...f.labels, label],
  }));
}

export function setSort(field: SortField) {
  filters.update((f) => ({
    ...f,
    sortBy: field,
    sortDir: f.sortBy === field ? (f.sortDir === 'asc' ? 'desc' : 'asc') : 'desc',
  }));
}

export function setViewMode(mode: ViewMode) {
  filters.update((f) => ({ ...f, viewMode: mode }));
}

function matchesSearch(album: Album, query: string): boolean {
  const q = query.toLowerCase();
  return (
    album.title.toLowerCase().includes(q) ||
    album.artistName.toLowerCase().includes(q) ||
    (album.labelName?.toLowerCase().includes(q) ?? false) ||
    album.tags.some((t) => t.toLowerCase().includes(q)) ||
    album.userTags.some((t) => t.toLowerCase().includes(q))
  );
}

function sortAlbums(a: Album, b: Album, field: SortField, dir: SortDirection): number {
  let cmp = 0;
  switch (field) {
    case 'title':
      cmp = a.title.localeCompare(b.title);
      break;
    case 'artist':
      cmp = a.artistName.localeCompare(b.artistName);
      break;
    case 'dateAdded': {
      const aTime = a.purchaseDate ? new Date(a.purchaseDate).getTime() : new Date(a.importedAt || 0).getTime();
      const bTime = b.purchaseDate ? new Date(b.purchaseDate).getTime() : new Date(b.importedAt || 0).getTime();
      cmp = aTime - bTime;
      break;
    }
    case 'dateReleased':
      cmp = (a.releaseDate || '').localeCompare(b.releaseDate || '');
      break;
    case 'rating':
      cmp = (a.userRating || 0) - (b.userRating || 0);
      break;
  }
  return dir === 'asc' ? cmp : -cmp;
}

export const filteredAlbums = derived([albums, filters], ([$albums, $filters]) => {
  let result = $albums;

  if ($filters.search) {
    result = result.filter((a) => matchesSearch(a, $filters.search));
  }

  if ($filters.tags.length > 0) {
    result = result.filter((a) => $filters.tags.every((t) => a.tags.includes(t)));
  }

  if ($filters.userTags.length > 0) {
    result = result.filter((a) => $filters.userTags.every((t) => a.userTags.includes(t)));
  }

  if ($filters.artists.length > 0) {
    result = result.filter((a) => $filters.artists.includes(a.artistName));
  }

  if ($filters.labels.length > 0) {
    result = result.filter((a) => a.labelName && $filters.labels.includes(a.labelName));
  }

  if ($filters.minRating > 0) {
    result = result.filter((a) => (a.userRating || 0) >= $filters.minRating);
  }

  if ($filters.hasRating === true) {
    result = result.filter((a) => a.userRating != null && a.userRating > 0);
  } else if ($filters.hasRating === false) {
    result = result.filter((a) => !a.userRating);
  }

  result.sort((a, b) => sortAlbums(a, b, $filters.sortBy, $filters.sortDir));

  return result;
});

export const activeFilterCount = derived(filters, ($f) => {
  let count = 0;
  if ($f.search) count++;
  count += $f.tags.length;
  count += $f.userTags.length;
  count += $f.artists.length;
  count += $f.labels.length;
  if ($f.minRating > 0) count++;
  if ($f.hasRating !== null) count++;
  return count;
});
