import { injectStyles, createBandChampButton, createBadge, createRatingStars } from '../lib/injection';

interface AlbumPageData {
  url: string;
  title: string;
  artist: string;
  artUrl?: string;
  tags: string[];
  tralbumData: Record<string, unknown> | null;
}

function detectPageType(): 'album' | 'track' | 'artist' | 'collection' | 'discover' | 'unknown' {
  const url = window.location.href;
  if (url.includes('/album/')) return 'album';
  if (url.includes('/track/')) return 'track';
  if (document.querySelector('#collection-grid')) return 'collection';
  if (url.includes('bandcamp.com/discover')) return 'discover';
  if (document.querySelector('#bio-container')) return 'artist';
  return 'unknown';
}

function extractTralbumData(): Record<string, unknown> | null {
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';
    const match = text.match(/var\s+TralbumData\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (match) {
      try { return JSON.parse(match[1]); } catch { /* skip */ }
    }
  }
  const playerEl = document.querySelector('[data-tralbum]');
  if (playerEl) {
    try { return JSON.parse(playerEl.getAttribute('data-tralbum') || ''); } catch { /* skip */ }
  }
  return null;
}

function extractAlbumPageData(): AlbumPageData {
  const title = document.querySelector('.trackTitle, h2.trackTitle')?.textContent?.trim() || document.title;
  const artist = document.querySelector('#name-section a span, span[itemprop="byArtist"]')?.textContent?.trim() || '';
  const artEl = document.querySelector('#tralbumArt img, .popupImage') as HTMLImageElement | null;
  const artUrl = artEl?.src;

  const tags: string[] = [];
  document.querySelectorAll('.tralbum-tags .tag').forEach((el) => {
    const tag = el.textContent?.trim();
    if (tag) tags.push(tag);
  });

  return {
    url: window.location.href,
    title,
    artist,
    artUrl,
    tags,
    tralbumData: extractTralbumData(),
  };
}

function injectAlbumUI(data: AlbumPageData) {
  // Find the buy/download buttons area
  const buyArea = document.querySelector('.buyItem, .buy-link, .tralbumCommands, h2.trackTitle');
  if (!buyArea) return;

  const container = document.createElement('div');
  container.className = 'bandchamp-container';

  // BandChamp label
  const label = document.createElement('span');
  label.className = 'bandchamp-container__label';
  label.textContent = 'BandChamp';
  container.appendChild(label);

  // Collection status badge — check with background script
  const badge = createBadge('Checking...', 'none');
  container.appendChild(badge);

  // Quick-rate stars
  const stars = createRatingStars(0, (rating) => {
    chrome.runtime.sendMessage({
      type: 'RATE_ALBUM',
      data: { url: data.url, rating },
    });
  });
  container.appendChild(stars);

  // Add to BandChamp button
  const addBtn = createBandChampButton('+ BandChamp', () => {
    chrome.runtime.sendMessage({
      type: 'ADD_ALBUM',
      data: {
        url: data.url,
        title: data.title,
        artist: data.artist,
        artUrl: data.artUrl,
        tags: data.tags,
      },
    }, (response) => {
      if (response?.ok) {
        addBtn.textContent = '✓ Added';
        addBtn.style.background = '#2dd4a8';
      }
    });
  });
  container.appendChild(addBtn);

  // Add to wishlist button
  const wishBtn = createBandChampButton('♡ Wishlist', () => {
    chrome.runtime.sendMessage({
      type: 'TOGGLE_WISHLIST',
      data: { url: data.url },
    }, (response) => {
      if (response?.wishlisted) {
        wishBtn.textContent = '♥ Wishlisted';
        wishBtn.style.background = '#f0b429';
      } else {
        wishBtn.textContent = '♡ Wishlist';
        wishBtn.style.background = '#1da0c3';
      }
    });
  });
  container.appendChild(wishBtn);

  // Insert after the buy area
  buyArea.parentNode?.insertBefore(container, buyArea.nextSibling);

  // Send album data to background for future sync
  chrome.runtime.sendMessage({
    type: 'ALBUM_DATA',
    data: {
      ...data,
      tralbumData: data.tralbumData,
    },
  });

  // Check collection status
  chrome.runtime.sendMessage({
    type: 'CHECK_STATUS',
    data: { url: data.url },
  }, (response) => {
    if (response?.inCollection) {
      badge.textContent = '✓ In Collection';
      badge.className = 'bandchamp-badge bandchamp-badge--owned';
    } else if (response?.wishlisted) {
      badge.textContent = '♥ Wishlisted';
      badge.className = 'bandchamp-badge bandchamp-badge--wishlisted';
    }
  });
}

function init() {
  const pageType = detectPageType();

  if (pageType === 'album' || pageType === 'track') {
    injectStyles();
    const data = extractAlbumPageData();
    injectAlbumUI(data);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
