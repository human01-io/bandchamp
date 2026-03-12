<script lang="ts">
  import {
    playerState,
    togglePlayPause,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  } from '$lib/stores/player';

  let seekBar: HTMLDivElement | undefined = $state();
  let isDragging = $state(false);

  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handleSeek(e: MouseEvent) {
    if (!seekBar || !$playerState.duration) return;
    const rect = seekBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * $playerState.duration);
  }

  function handleSeekStart(e: MouseEvent) {
    isDragging = true;
    handleSeek(e);

    const onMove = (ev: MouseEvent) => handleSeek(ev);
    const onUp = () => {
      isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const progress = $derived(
    $playerState.duration > 0 ? ($playerState.currentTime / $playerState.duration) * 100 : 0,
  );
</script>

{#if $playerState.currentTrack || $playerState.isLoading}
  <div class="fixed bottom-[52px] left-0 right-0 z-50 border-t border-border bg-bg-card md:bottom-0">
    <!-- Seek bar -->
    <div
      bind:this={seekBar}
      onmousedown={handleSeekStart}
      role="slider"
      tabindex="0"
      aria-label="Seek"
      aria-valuenow={$playerState.currentTime}
      aria-valuemax={$playerState.duration}
      class="group relative h-1.5 w-full cursor-pointer transition-all hover:h-2.5"
    >
      <div class="absolute inset-0 bg-bg"></div>
      <div
        class="absolute left-0 top-0 h-full bg-accent transition-all"
        style="width: {progress}%"
      ></div>
    </div>

    <div class="flex h-[72px] items-center gap-4 px-4">
      <!-- Track info (left) -->
      <div class="flex min-w-0 flex-1 items-center gap-3">
        {#if $playerState.isLoading}
          <div class="h-12 w-12 shrink-0 animate-pulse rounded bg-bg"></div>
          <div class="min-w-0">
            <div class="h-3.5 w-24 animate-pulse rounded bg-bg"></div>
            <div class="mt-1 h-3 w-16 animate-pulse rounded bg-bg"></div>
          </div>
        {:else if $playerState.currentTrack}
          {#if $playerState.currentTrack.coverArtUrl}
            <img
              src={$playerState.currentTrack.coverArtUrl}
              alt={$playerState.currentTrack.albumTitle}
              class="h-12 w-12 shrink-0 rounded object-cover"
            />
          {:else}
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-bg text-[8px] text-text-dim">
              N/A
            </div>
          {/if}
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">{$playerState.currentTrack.title}</div>
            <div class="truncate text-xs text-text-muted">{$playerState.currentTrack.artistName}</div>
          </div>
        {/if}
      </div>

      <!-- Controls (center) -->
      <div class="flex items-center gap-2">
        <button
          onclick={toggleShuffle}
          class="hidden p-2 text-sm transition-colors sm:block
                 {$playerState.shuffle ? 'text-accent' : 'text-text-dim hover:text-text'}"
          title="Shuffle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 3 21 3 21 8"></polyline>
            <line x1="4" y1="20" x2="21" y2="3"></line>
            <polyline points="21 16 21 21 16 21"></polyline>
            <line x1="15" y1="15" x2="21" y2="21"></line>
            <line x1="4" y1="4" x2="9" y2="9"></line>
          </svg>
        </button>

        <button onclick={prev} class="p-2 text-text-muted transition-colors hover:text-text" title="Previous">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button
          onclick={togglePlayPause}
          disabled={$playerState.isLoading}
          class="flex h-10 w-10 items-center justify-center rounded-full bg-text text-bg transition-transform hover:scale-105 disabled:opacity-50"
          title={$playerState.isPlaying ? 'Pause' : 'Play'}
        >
          {#if $playerState.isLoading}
            <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          {:else if $playerState.isPlaying}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          {/if}
        </button>

        <button onclick={next} class="p-2 text-text-muted transition-colors hover:text-text" title="Next">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <button
          onclick={cycleRepeat}
          class="hidden p-2 text-sm transition-colors sm:block
                 {$playerState.repeat !== 'off' ? 'text-accent' : 'text-text-dim hover:text-text'}"
          title="Repeat: {$playerState.repeat}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 014-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 01-4 4H3"></path>
          </svg>
          {#if $playerState.repeat === 'one'}
            <span class="absolute -mt-3 ml-1 text-[8px] font-bold text-accent">1</span>
          {/if}
        </button>
      </div>

      <!-- Time + Volume (right) -->
      <div class="hidden flex-1 items-center justify-end gap-3 sm:flex">
        <span class="text-xs tabular-nums text-text-dim">
          {formatTime($playerState.currentTime)} / {formatTime($playerState.duration)}
        </span>
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-dim">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"></path>
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={$playerState.volume}
            oninput={(e) => setVolume(parseFloat(e.currentTarget.value))}
            class="h-1 w-20 cursor-pointer appearance-none rounded-full bg-bg
                   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-text"
          />
        </div>
      </div>
    </div>
  </div>
{/if}
