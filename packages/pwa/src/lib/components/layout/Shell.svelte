<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import PlayerBar from '../player/PlayerBar.svelte';
  import { playerState } from '$lib/stores/player';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const hasPlayer = $derived($playerState.currentTrack !== null || $playerState.isLoading);
</script>

<div class="flex h-screen overflow-hidden">
  <Sidebar />
  <!-- Mobile: always needs pb for bottom nav (52px). With player: add 84px more -->
  <!-- Desktop: only needs pb when player is visible -->
  <main
    class="flex-1 overflow-y-auto pb-[52px] md:pb-0
           {hasPlayer ? 'pb-[136px] md:pb-[84px]' : ''}"
  >
    {@render children()}
  </main>
</div>
<PlayerBar />
