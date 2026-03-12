// BandChamp extension background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('[BandChamp] Extension installed');
});

// ─── Message handlers from content script ────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'ALBUM_DATA': {
      // Store last viewed album data
      chrome.storage.local.set({
        lastAlbumData: message.data,
        lastAlbumTime: Date.now(),
      });
      sendResponse({ ok: true });
      break;
    }

    case 'ADD_ALBUM': {
      // Store in extension's local collection
      chrome.storage.local.get(['collection'], (result) => {
        const collection: Record<string, unknown>[] = result.collection || [];
        const exists = collection.some((a: any) => a.url === message.data.url);
        if (!exists) {
          collection.push({
            ...message.data,
            addedAt: new Date().toISOString(),
          });
          chrome.storage.local.set({ collection });
        }
        sendResponse({ ok: true, alreadyExists: exists });
      });
      return true; // async response
    }

    case 'RATE_ALBUM': {
      chrome.storage.local.get(['ratings'], (result) => {
        const ratings: Record<string, number> = result.ratings || {};
        ratings[message.data.url] = message.data.rating;
        chrome.storage.local.set({ ratings });
        sendResponse({ ok: true });
      });
      return true;
    }

    case 'TOGGLE_WISHLIST': {
      chrome.storage.local.get(['wishlist'], (result) => {
        const wishlist: string[] = result.wishlist || [];
        const idx = wishlist.indexOf(message.data.url);
        if (idx >= 0) {
          wishlist.splice(idx, 1);
          chrome.storage.local.set({ wishlist });
          sendResponse({ ok: true, wishlisted: false });
        } else {
          wishlist.push(message.data.url);
          chrome.storage.local.set({ wishlist });
          sendResponse({ ok: true, wishlisted: true });
        }
      });
      return true;
    }

    case 'CHECK_STATUS': {
      chrome.storage.local.get(['collection', 'wishlist'], (result) => {
        const collection: any[] = result.collection || [];
        const wishlist: string[] = result.wishlist || [];
        const inCollection = collection.some((a: any) => a.url === message.data.url);
        const wishlisted = wishlist.includes(message.data.url);
        sendResponse({ inCollection, wishlisted });
      });
      return true;
    }

    case 'GET_STATS': {
      chrome.storage.local.get(['collection', 'wishlist', 'ratings'], (result) => {
        const collection: any[] = result.collection || [];
        const wishlist: string[] = result.wishlist || [];
        const ratings: Record<string, number> = result.ratings || {};
        sendResponse({
          albumCount: collection.length,
          wishlistCount: wishlist.length,
          ratedCount: Object.keys(ratings).length,
          recentAlbums: collection.slice(-5).reverse(),
        });
      });
      return true;
    }
  }
});

// ─── External message handlers (from PWA) ────────────────

chrome.runtime.onMessageExternal?.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_PROXY') {
    fetch(message.url, {
      method: message.method || 'GET',
      headers: message.headers || {},
      body: message.body || undefined,
    })
      .then((res) => res.text())
      .then((text) => sendResponse({ ok: true, data: text }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_EXTENSION_DATA') {
    chrome.storage.local.get(null, (data) => {
      sendResponse({ ok: true, data });
    });
    return true;
  }
});
