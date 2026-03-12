export interface Collector {
  name: string;
  url: string;
}

export interface AlbumOffer {
  format: string;
  formatName?: string;
  price?: number;
  priceCurrency?: string;
  soldOut: boolean;
}

export interface Album {
  /** Unique ID derived from Bandcamp URL slug */
  id: string;
  bandcampUrl: string;
  title: string;
  artistId: string;
  artistName: string;
  labelName?: string;
  labelUrl?: string;
  coverArtUrl: string;
  coverArtUrlSmall?: string;
  releaseDate?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency?: string;
  tags: string[];
  userTags: string[];
  userRating?: number;
  userNotes?: string;
  itemType?: 'album' | 'track';
  trackCount?: number;
  collectorCount?: number;
  collectors?: Collector[];
  about?: string;
  credits?: string;
  digitalPrice?: number;
  digitalCurrency?: string;
  offers?: AlbumOffer[];
  labelLocation?: string;
  labelAbout?: string;
  duration?: number;
  format?: string;
  importedAt: string;
  updatedAt: string;
}
