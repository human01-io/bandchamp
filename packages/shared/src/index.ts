// Types
export type {
  Album,
  AlbumOffer,
  Collector,
} from './types/album.js';
export type {
  Artist,
} from './types/artist.js';
export type {
  Collection,
} from './types/collection.js';
export type {
  Track,
} from './types/track.js';
export type {
  WishlistItem,
  WishlistPriority,
} from './types/wishlist.js';
export type {
  GraphNode,
  GraphEdge,
  GraphData,
  GraphNodeType,
  GraphEdgeType,
} from './types/graph.js';

// Database
export {
  getDB,
} from './db/schema.js';
export {
  getAllAlbums,
  getAlbum,
  putAlbum,
  putAlbums,
  deleteAlbum,
  getAlbumsByArtist,
  getAlbumsByTag,
  getAllArtists,
  getArtist,
  putArtist,
  putArtists,
  getAllWishlistItems,
  getWishlistItem,
  getWishlistByAlbum,
  putWishlistItem,
  deleteWishlistItem,
  getTracksByAlbum,
  putTracks,
  putTrack,
  getMeta,
  setMeta,
  clearAllData,
} from './db/client.js';

// Scraper
export {
  extractFanId,
  extractCollectionCount,
  extractInitialCollection,
  collectionItemToAlbum,
  extractArtists,
  fetchCollection,
} from './scraper/collection.js';
export type {
  BandcampCollectionItem,
  BandcampCollectionResponse,
  ImportProgress,
} from './scraper/collection.js';
export {
  parseAlbumPage,
  parseTrackPageCollectorCount,
} from './scraper/album.js';
export type {
  AlbumDetail,
  AlbumTrackInfo,
} from './scraper/album.js';
export {
  RateLimiter,
  bandcampLimiter,
} from './scraper/rate-limiter.js';
export type {
  RateLimiterOptions,
} from './scraper/rate-limiter.js';

// Graph
export {
  buildGraphData,
  getConnectedSubgraph,
} from './utils/graph.js';
export type {
  GraphOptions,
} from './utils/graph.js';

// Recommendations
export {
  buildTagProfile,
  findTopArtists,
  findSimilarAlbums,
  buildRecommendations,
  digCrate,
  tagSimilarity,
} from './utils/recommendations.js';
export type {
  TagProfile,
  ArtistCluster,
  Recommendation,
} from './utils/recommendations.js';
