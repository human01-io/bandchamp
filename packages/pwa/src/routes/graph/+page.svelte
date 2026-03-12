<script lang="ts">
  import { albums } from '$lib/stores/collection';
  import NetworkGraph from '$lib/components/graph/NetworkGraph.svelte';
  import GraphControls from '$lib/components/graph/GraphControls.svelte';
  import { buildGraphData } from '@bandchamp/shared';
  import type { GraphOptions, GraphNode } from '@bandchamp/shared';

  let options: GraphOptions = $state({
    showAlbums: true,
    showArtists: true,
    showTags: true,
    showLabels: false,
    minConnections: 2,
    maxNodes: 300,
  });

  const graphData = $derived(buildGraphData($albums, options));
  let selectedNode: GraphNode | null = $state(null);

  function handleNodeClick(node: GraphNode) {
    selectedNode = node;
    if (node.type === 'album') {
      // Could navigate to album detail
    }
  }
</script>

<div class="relative flex h-full flex-col">
  {#if $albums.length === 0}
    <div class="flex flex-1 flex-col items-center justify-center">
      <h2 class="text-xl font-semibold text-text-muted">No collection data</h2>
      <p class="mt-2 text-sm text-text-dim">Import your Bandcamp collection to see the network graph</p>
      <a
        href="/settings"
        class="mt-4 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
      >
        Import Collection
      </a>
    </div>
  {:else}
    <div class="relative flex-1">
      <NetworkGraph
        albums={$albums}
        {options}
        onNodeClick={handleNodeClick}
      />
      <GraphControls
        bind:options
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.edges.length}
      />

      <!-- Selected node detail panel -->
      {#if selectedNode}
        <div class="absolute bottom-4 left-4 right-4 z-10 rounded-xl border border-border bg-bg/95 p-4 shadow-lg backdrop-blur-sm sm:left-auto sm:w-72">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-3 w-3 rounded-full"
                style="background-color: {selectedNode.type === 'album' ? '#1da0c3' : selectedNode.type === 'artist' ? '#e879f9' : selectedNode.type === 'tag' ? '#34d399' : '#fbbf24'}"
              ></span>
              <span class="text-xs font-medium uppercase text-text-dim">{selectedNode.type}</span>
            </div>
            <button
              onclick={() => (selectedNode = null)}
              class="text-text-dim hover:text-text-muted"
            >
              &times;
            </button>
          </div>
          <h3 class="mt-2 text-lg font-semibold">{selectedNode.label}</h3>
          {#if selectedNode.size}
            <p class="text-sm text-text-muted">{selectedNode.size} connections</p>
          {/if}
          {#if selectedNode.type === 'album'}
            <a
              href="/collection/{encodeURIComponent(selectedNode.id.replace('album:', ''))}"
              class="mt-3 inline-block rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
            >
              View Album
            </a>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
