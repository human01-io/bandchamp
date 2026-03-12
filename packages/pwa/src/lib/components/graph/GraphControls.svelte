<script lang="ts">
  import type { GraphOptions } from '@bandchamp/shared';

  let {
    options = $bindable(),
    nodeCount = 0,
    edgeCount = 0,
  }: {
    options: GraphOptions;
    nodeCount?: number;
    edgeCount?: number;
  } = $props();

  let collapsed = $state(false);
</script>

<div class="absolute left-2 top-2 z-10 sm:left-4 sm:top-4">
  <!-- Mobile: collapsible toggle -->
  <button
    onclick={() => (collapsed = !collapsed)}
    class="mb-1 flex items-center gap-2 rounded-xl border border-border bg-bg/95 px-3 py-2
           text-sm font-semibold shadow-lg backdrop-blur-sm sm:hidden"
  >
    Controls {collapsed ? '▸' : '▾'}
  </button>

  <div
    class="w-48 rounded-xl border border-border bg-bg/95 p-3 shadow-lg backdrop-blur-sm
           sm:w-56 sm:p-4
           {collapsed ? 'hidden sm:block' : ''}"
  >
    <h3 class="mb-3 hidden text-sm font-semibold sm:block">Graph Controls</h3>

    <!-- Node type toggles -->
    <div class="mb-3 space-y-2 sm:mb-4">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={options.showAlbums} class="accent-accent" />
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-full bg-accent"></span>
          Albums
        </span>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={options.showArtists} class="accent-accent" />
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-full bg-[#e879f9]"></span>
          Artists
        </span>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={options.showTags} class="accent-accent" />
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-full bg-[#34d399]"></span>
          Tags
        </span>
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={options.showLabels} class="accent-accent" />
        <span class="flex items-center gap-1.5">
          <span class="inline-block h-2.5 w-2.5 rounded-full bg-[#fbbf24]"></span>
          Labels
        </span>
      </label>
    </div>

    <!-- Min connections slider -->
    <label class="mb-3 block sm:mb-4">
      <span class="mb-1 flex items-center justify-between text-xs text-text-muted">
        <span>Min connections</span>
        <span class="font-mono">{options.minConnections}</span>
      </span>
      <input
        type="range"
        min="1"
        max="10"
        bind:value={options.minConnections}
        class="w-full accent-accent"
      />
    </label>

    <!-- Max nodes slider -->
    <label class="mb-3 block sm:mb-4">
      <span class="mb-1 flex items-center justify-between text-xs text-text-muted">
        <span>Max nodes</span>
        <span class="font-mono">{options.maxNodes}</span>
      </span>
      <input
        type="range"
        min="50"
        max="1000"
        step="50"
        bind:value={options.maxNodes}
        class="w-full accent-accent"
      />
    </label>

    <!-- Stats -->
    <div class="border-t border-border pt-3 text-xs text-text-dim">
      <div class="flex justify-between">
        <span>Nodes</span>
        <span>{nodeCount}</span>
      </div>
      <div class="flex justify-between">
        <span>Edges</span>
        <span>{edgeCount}</span>
      </div>
    </div>
  </div>
</div>
