# Bandcamp Open-Source Ecosystem Research

Research conducted 2026-03-11.

---

## Scrapers / API Wrappers

### bandcamp-fetch (TypeScript, MIT)
- **URL:** https://github.com/patrickkfkan/bandcamp-fetch
- **npm:** bandcamp-fetch
- Full-featured scraping library: fan collections, wishlists, discovery, album/track info, tag browsing
- Cookie-based auth for private collections
- Rate limiting via Bottleneck (configurable `maxConcurrent`, `minTime`)
- Multiple user session support
- ESM + CJS hybrid with type definitions
- **Most relevant to bandchamp's `packages/shared` scraper**

### bandcamp-scraper (JavaScript, MIT)
- **URL:** https://github.com/masterT/bandcamp-scraper
- **npm:** bandcamp-scraper
- ~200 stars
- Search artists/albums, get album/track info, tag-based discovery
- Extracts `TralbumData` embedded JSON from pages
- Daily CI tests via GitHub Actions to detect Bandcamp HTML changes

### Bandcamp-API Documentation (OpenAPI)
- **URL:** https://github.com/michaelherger/Bandcamp-API
- **Swagger UI:** https://michaelherger.github.io/Bandcamp-API/
- OpenAPI v3.0 docs for Bandcamp's undocumented internal API
- Covers `/api/fancollection`, `/api/discover`, and more
- Documents `older_than_token` pagination format (5 colon-separated fields including Unix epoch timestamp)
- Key endpoints:
  - `/api/fancollection/1/collection_items` — purchased items
  - `/api/fancollection/1/wishlist_items` — wishlisted items
  - `/api/fancollection/1/search_items` — search within a collection
  - `/api/discover/1/discover_web` — tag-based discovery

### scriptkittie/bandcamp-api (Java)
- **URL:** https://github.com/scriptkittie/bandcamp-api
- Java API wrapper using internal JSON API with async support
- Less directly useful (wrong language) but documents the same endpoints

### bandcamp-library-scraper (Python)
- **URL:** https://github.com/dbeley/bandcamp-library-scraper
- Exports Bandcamp library metadata to CSV
- Selenium-based

---

## Collection Managers / Exporters

### bandcamp-collection-downloader (Kotlin)
- **URL:** https://github.com/Ezwen/bandcamp-collection-downloader
- CLI tool to download all purchases from a Bandcamp account
- Cookie-based authentication

### bandsnatch (Rust)
- **URL:** https://github.com/Ovyerus/bandsnatch
- Batch downloader with caching to skip previously downloaded items
- Cookie extraction from browser extensions

### bandcampsync (Python)
- **URL:** https://github.com/meeb/bandcampsync
- Syncs purchases to local directory (for Plex/Jellyfin), Docker-ready

### Bandcamp-script-deluxe-edition (JavaScript userscript)
- **URL:** https://github.com/cvzi/Bandcamp-script-deluxe-edition
- Tampermonkey userscript: discography player, played album manager, export/backup
- Direct DOM manipulation on Bandcamp pages; album play-state tracking

---

## Discovery / Recommendation

### bandcamp-explorer (Java + Angular)
- **URL:** https://github.com/bKalbitz/bandcamp-explorer
- Finds music via **collection intersections** — albums appearing in multiple fans' collections
- Spring Boot backend + Angular frontend
- Key concept: if many fans who own Album A also own Album B, recommend Album B
- Conceptually similar to bandchamp's graph approach but uses set intersection

### CampExplorer (JavaScript)
- **URL:** https://github.com/SvDvorak/CampExplorer
- **Live site:** https://campexplorer.io/
- Multi-tag search (Bandcamp natively only supports single-tag)
- Website + Chrome extension
- Combines Bandcamp's tag discovery API results across multiple tags

### BandcampPlayer (JavaScript)
- **URL:** https://github.com/inevolin/BandcampPlayer
- Simplified player for discovering music via recommended and latest tracks

### graph-based-music-recommendation-system (general, not Bandcamp-specific)
- **URL:** https://github.com/pmanjunath29/graph-based-music-recommendation-system
- Hypergraph random walks on Last.fm + Spotify data
- D3 visualization — architecturally similar to bandchamp's force-graph approach

---

## Chrome Extensions

### BandcampEnhancementSuite (JavaScript, MIT)
- **URL:** https://github.com/sabjorn/BandcampEnhancementSuite
- DJ-focused: 1-click add to cart, cart import/export, BPM display, waveform interaction
- Content script injection on Bandcamp pages; cart state management

### amp-for-bandcamp (JavaScript)
- **URL:** https://github.com/rafalenden/amp-for-bandcamp
- Multi-browser extension (Chrome, Firefox, Safari)
- Shortcuts, playback controls, UI improvements

### bandcamp-feed-playlist (JavaScript)
- **URL:** https://github.com/lovethebomb/bandcamp-feed-playlist
- Mini player on Bandcamp feed with autoplay, next/prev

### bandcamp-streamer (JavaScript)
- **URL:** https://github.com/AFlowOfCode/bandcamp-streamer
- Chrome + Firefox extension for streaming

---

## Key Scraping Techniques

### TralbumData Extraction
Bandcamp embeds `var TralbumData = {...}` on every album/track page with full structured metadata (tracks, prices, tags, artist info, streaming URLs). Most scrapers parse this with regex or DOM parsing rather than hitting any API.

### Fan Collection API (`/api/fancollection`)
- Pagination uses `older_than_token` (5 colon-delimited fields, includes Unix timestamp)
- Initial page load embeds first ~45 items; subsequent pages require API calls

### Discovery API (`/api/discover`)
- Tag-based discovery with sorting and filtering options

### Authentication
- Cookie-based auth (`identity` cookie) for private data
- `X-Bandcamp-Dm` and `X-Bandcamp-Pow` headers for login protection (reverse-engineered from Android app)
- Reference: https://mijailovic.net/2024/04/04/bandcamp-auth/

---

## Top Candidates for Reuse in Bandchamp

| Project | Use Case | Priority |
|---|---|---|
| **bandcamp-fetch** | Replace/augment custom scraper in `packages/shared` | High |
| **Bandcamp-API docs** | API reference for internal endpoints | High |
| **bandcamp-explorer** | Collection-intersection recommendation algorithm | Medium |
| **CampExplorer** | Multi-tag search logic | Medium |
| **BandcampEnhancementSuite** | Chrome extension content script patterns | Low |
