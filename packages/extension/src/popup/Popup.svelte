<script lang="ts">
  import { onMount } from 'svelte';

  let stats = $state({
    albumCount: 0,
    wishlistCount: 0,
    ratedCount: 0,
    recentAlbums: [] as { title: string; artist: string; artUrl?: string; url: string }[],
  });
  let loading = $state(true);

  onMount(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
      if (response) {
        stats = response;
      }
      loading = false;
    });
  });
</script>

<div class="popup">
  <header>
    <h1><span class="accent">Band</span>Champ</h1>
  </header>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else}
    <div class="stats">
      <div class="stat">
        <div class="stat-value">{stats.albumCount}</div>
        <div class="stat-label">Albums</div>
      </div>
      <div class="stat">
        <div class="stat-value">{stats.wishlistCount}</div>
        <div class="stat-label">Wishlist</div>
      </div>
      <div class="stat">
        <div class="stat-value">{stats.ratedCount}</div>
        <div class="stat-label">Rated</div>
      </div>
    </div>

    {#if stats.recentAlbums.length > 0}
      <div class="recent">
        <div class="section-title">Recently Added</div>
        {#each stats.recentAlbums as album}
          <a href={album.url} target="_blank" class="recent-item">
            {#if album.artUrl}
              <img src={album.artUrl} alt="" class="recent-art" />
            {:else}
              <div class="recent-art placeholder"></div>
            {/if}
            <div class="recent-info">
              <div class="recent-title">{album.title}</div>
              <div class="recent-artist">{album.artist}</div>
            </div>
          </a>
        {/each}
      </div>
    {/if}

    <a href="http://localhost:5173" target="_blank" class="open-app">
      Open BandChamp
    </a>
  {/if}
</div>

<style>
  .popup {
    padding: 16px;
    width: 300px;
  }
  header h1 {
    margin: 0 0 12px;
    font-size: 18px;
    color: #e8e8e8;
    font-weight: 700;
  }
  .accent { color: #1da0c3; }
  .loading {
    text-align: center;
    color: #888;
    padding: 20px 0;
    font-size: 13px;
  }

  .stats {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .stat {
    flex: 1;
    background: #1a1a1a;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }
  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #1da0c3;
  }
  .stat-label {
    font-size: 10px;
    color: #888;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .recent { margin-bottom: 12px; }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
    margin-bottom: 8px;
  }
  .recent-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    text-decoration: none;
    color: inherit;
    border-radius: 4px;
    transition: opacity 0.15s;
  }
  .recent-item:hover { opacity: 0.8; }
  .recent-art {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .recent-art.placeholder {
    background: #2a2a2a;
  }
  .recent-info { min-width: 0; }
  .recent-title {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #e8e8e8;
  }
  .recent-artist {
    font-size: 11px;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .open-app {
    display: block;
    text-align: center;
    padding: 10px;
    background: #1da0c3;
    color: #0f0f0f;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    transition: background 0.15s;
  }
  .open-app:hover { background: #22b8e0; }
</style>
