# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm install                    # Install all dependencies
pnpm run build:shared           # Build shared library FIRST (required before PWA/extension)
pnpm run dev                    # Start PWA dev server (localhost:5173)
pnpm run build                  # Build all packages
pnpm run check                  # Type-check all packages

# Per-package
pnpm --filter @bandchamp/shared build   # Build shared lib (tsup)
pnpm --filter @bandchamp/pwa dev        # PWA dev server
pnpm --filter @bandchamp/extension build # Build Chrome extension to packages/extension/dist/
```

No test framework is configured yet.

## Architecture

pnpm monorepo with three packages:

- **`packages/shared`** — Core library (types, IndexedDB client via `idb`, Bandcamp scraper, graph builder, recommendation engine). Built with tsup, exports two entry points: main (`@bandchamp/shared`) and types-only (`@bandchamp/shared/types`).

- **`packages/pwa`** — SvelteKit 2 + Svelte 5 PWA. The main user-facing app. Uses Tailwind CSS v4 (via `@tailwindcss/vite`), `force-graph` for network visualization, and IndexedDB for all storage. Includes a service worker (cache-first for assets, network-first for navigation) and a `/api/proxy` route for CORS-proxying Bandcamp requests during dev.

- **`packages/extension`** — Chrome Manifest V3 extension. Vite multi-entry build producing background service worker, content script (injected on bandcamp.com), and Svelte popup. Output goes to `dist/` for loading as unpacked extension.

## Key Patterns

- **Offline-first**: All data in IndexedDB, no external server. The CORS proxy at `/api/proxy` is dev-only.
- **Svelte 5 runes**: Uses `$state`, `$derived`, `$effect` — not legacy reactive syntax.
- **Stores in `pwa/src/lib/stores/`**: `collection.ts` (albums/artists), `filters.ts` (search/sort/filter state with derived `filteredAlbums`), `import.ts` (scraper orchestration with progress), `wishlist.ts`, `ui.ts` (theme/sidebar).
- **Shared library must be built before PWA or extension** — they depend on `@bandchamp/shared` via `workspace:*`.
- **Graph visualization**: `shared/utils/graph.ts` builds force-graph-compatible nodes/edges from albums. Node types: album (cyan), artist (magenta), tag (green), label (gold).
- **Discovery algorithms**: `shared/utils/recommendations.ts` — tag profile weighting, Jaccard similarity for album recommendations, random dig crate picker.

## Code Style

- Prettier: single quotes, semicolons, trailing commas, 100 char width, 2-space indent
- Prettier Svelte plugin for `.svelte` files
- Components use PascalCase, stores use camelCase, routes use kebab-case
