# BandChamp

Supercharge your Bandcamp experience. A hybrid PWA + Chrome extension for music collectors and DJs.

BandChamp imports your Bandcamp collection and gives you power-user tools: advanced filtering, custom tags and ratings, a visual network graph of your library, taste-based discovery, a randomized dig crate, wishlist management, and offline access — all running locally in your browser with zero accounts or servers.

## Features

### Collection Management
- Import your public Bandcamp collection by username
- Grid and list views with lazy-loaded cover art
- Search across titles, artists, labels, and tags
- Filter by tag, rating, artist, label — combine and sort freely
- Star ratings (1–5), custom tags, and notes per album
- Multi-select with bulk tag, bulk rate, and export (JSON/CSV)

### Network Graph
- Interactive force-directed graph of your collection
- Album nodes render cover art thumbnails on Canvas
- Color-coded node types: albums (cyan), artists (purple), tags (green), labels (gold)
- Toggle node types, adjust min-connections and max-nodes
- Hover to highlight connected subgraph, click for detail panel

### Discovery
- **For You** — recommendations based on your tag/artist/label affinities
- **Genre Map** — tag cloud sized by weight + top-20 bar chart of your taste profile
- **Dig Crate** — randomized album picker with genre filter, count selector, and unrated-only mode

### Wishlist
- Add albums from the detail page with priority levels (high/medium/low)
- Sorted wishlist view with Bandcamp links and date tracking

### Chrome Extension
- Injects BandChamp UI on Bandcamp album and track pages
- "Add to BandChamp" button, collection status badge, quick-rate stars, wishlist toggle
- Extension popup with collection stats and recent additions
- CORS proxy for PWA import (bypasses cross-origin restrictions)

### PWA & Offline
- Installable as a standalone app (web app manifest)
- Service worker caches app shell and cover art for offline browsing
- Dark and light themes
- Full data export/import for backup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2, Svelte 5 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Graph | force-graph (Canvas, d3-force) |
| Storage | IndexedDB via idb |
| Extension | Chrome Manifest V3, Vite |
| Monorepo | pnpm workspaces |

## Project Structure

```
bandchamp/
├── packages/
│   ├── shared/            # Types, DB layer, scraper, graph + recommendation engines
│   │   └── src/
│   │       ├── types/     # Album, Artist, Collection, Wishlist, Graph
│   │       ├── db/        # IndexedDB schema + CRUD
│   │       ├── scraper/   # Bandcamp collection & album parsers
│   │       └── utils/     # Graph computation, recommendations, dig crate
│   ├── pwa/               # SvelteKit 2 progressive web app
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── stores/       # collection, filters, import, wishlist, ui
│   │       │   └── components/   # layout, collection, graph, discovery, wishlist
│   │       ├── routes/           # /, /collection, /graph, /discover, /wishlist, /settings
│   │       └── service-worker.ts
│   └── extension/         # Chrome Manifest V3 extension
│       └── src/
│           ├── content/   # Bandcamp page injection
│           ├── popup/     # Extension popup (Svelte)
│           └── lib/       # Messaging, DOM injection helpers
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Install & Run

```bash
# Install dependencies
pnpm install

# Build the shared library (required first time)
pnpm --filter @bandchamp/shared build

# Start the PWA dev server
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173), go to **Settings**, enter a Bandcamp username, and import.

### Chrome Extension

```bash
# Build the extension
pnpm --filter @bandchamp/extension build
```

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select `packages/extension/dist`
4. Browse any Bandcamp album page to see the injected BandChamp UI

### Build for Production

```bash
pnpm run build
```

## Data & Privacy

All data is stored locally in your browser's IndexedDB. Nothing is sent to any server. The SvelteKit proxy route (`/api/proxy`) only forwards requests to `bandcamp.com` during import — it runs on your local dev server, not a remote backend.

You can export a full backup from Settings at any time.

## License

MIT
