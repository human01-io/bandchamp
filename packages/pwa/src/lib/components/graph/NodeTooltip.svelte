<script lang="ts">
  import type { GraphNode } from '@bandchamp/shared';

  let {
    node,
    x = 0,
    y = 0,
  }: {
    node: GraphNode | null;
    x?: number;
    y?: number;
  } = $props();

  const typeColors: Record<string, string> = {
    album: '#1da0c3',
    artist: '#e879f9',
    tag: '#34d399',
    label: '#fbbf24',
  };

  const typeLabels: Record<string, string> = {
    album: 'Album',
    artist: 'Artist',
    tag: 'Tag',
    label: 'Label',
  };
</script>

{#if node}
  <div
    class="pointer-events-none absolute z-50 rounded-lg border border-border bg-bg-card/95 p-3 shadow-xl backdrop-blur-sm"
    style="left: {x + 12}px; top: {y - 12}px; max-width: 240px;"
  >
    <div class="flex items-center gap-2">
      <span
        class="inline-block h-2 w-2 rounded-full"
        style="background-color: {typeColors[node.type] || '#888'}"
      ></span>
      <span class="text-[10px] font-medium uppercase text-text-dim">
        {typeLabels[node.type] || node.type}
      </span>
    </div>
    <div class="mt-1 text-sm font-medium">{node.label}</div>
    {#if node.size && node.size > 1}
      <div class="mt-0.5 text-xs text-text-muted">
        {node.size} connections
      </div>
    {/if}
  </div>
{/if}
