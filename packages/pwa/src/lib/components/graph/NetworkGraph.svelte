<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { buildGraphData, getConnectedSubgraph } from '@bandchamp/shared';
  import type { GraphNode, GraphData, GraphOptions } from '@bandchamp/shared';
  import type { Album } from '@bandchamp/shared';

  let {
    albums,
    options,
    onNodeClick,
  }: {
    albums: Album[];
    options: GraphOptions;
    onNodeClick?: (node: GraphNode) => void;
  } = $props();

  let container: HTMLDivElement;
  let graph: any = null;
  let hoveredNode: GraphNode | null = $state(null);
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let graphData: GraphData = $state({ nodes: [], edges: [] });
  let highlightedNodes: Set<string> | null = $state(null);
  let ForceGraph: any = null;

  const NODE_COLORS: Record<string, string> = {
    album: '#1da0c3',
    artist: '#e879f9',
    tag: '#34d399',
    label: '#fbbf24',
  };

  // Cache for album cover images
  const imageCache = new Map<string, HTMLImageElement>();

  function loadImage(url: string): HTMLImageElement | null {
    if (imageCache.has(url)) return imageCache.get(url)!;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      imageCache.set(url, img);
      graph?.refresh();
    };
    return null;
  }

  function rebuildGraph() {
    graphData = buildGraphData(albums, options);

    if (graph) {
      graph.graphData({
        nodes: graphData.nodes.map((n) => ({ ...n })),
        links: graphData.edges.map((e) => ({ ...e })),
      });
    }
  }

  $effect(() => {
    // Re-derive when albums or options change
    const _ = [albums.length, options.showAlbums, options.showArtists, options.showTags, options.showLabels, options.minConnections, options.maxNodes];
    rebuildGraph();
  });

  onMount(async () => {
    const mod = await import('force-graph');
    ForceGraph = mod.default;

    graph = ForceGraph()(container)
      .backgroundColor('#0f0f0f')
      .nodeRelSize(6)
      .nodeVal((node: any) => {
        const base = node.type === 'album' ? 2 : Math.min(node.size || 1, 15);
        return base;
      })
      .nodeColor((node: any) => {
        if (highlightedNodes && !highlightedNodes.has(node.id)) return '#222';
        return NODE_COLORS[node.type] || '#888';
      })
      .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const size = Math.sqrt(node.type === 'album' ? 2 : Math.min(node.size || 1, 15)) * 6;
        const isHighlighted = !highlightedNodes || highlightedNodes.has(node.id);
        const alpha = isHighlighted ? 1 : 0.15;

        ctx.globalAlpha = alpha;

        // Album nodes: draw cover art
        if (node.type === 'album' && node.imageUrl) {
          const img = loadImage(node.imageUrl);
          if (img) {
            const imgSize = size * 1.8;
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, imgSize / 2, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(img, node.x - imgSize / 2, node.y - imgSize / 2, imgSize, imgSize);
            ctx.restore();
            // Border
            ctx.strokeStyle = isHighlighted ? NODE_COLORS.album : '#222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(node.x, node.y, imgSize / 2, 0, 2 * Math.PI);
            ctx.stroke();
          } else {
            // Placeholder circle
            ctx.fillStyle = isHighlighted ? NODE_COLORS.album : '#222';
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else {
          // Non-album nodes: colored circle
          ctx.fillStyle = isHighlighted ? (NODE_COLORS[node.type] || '#888') : '#222';
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Labels for non-album nodes when zoomed in
        if (node.type !== 'album' && globalScale > 1.5 && isHighlighted) {
          ctx.globalAlpha = alpha * 0.9;
          ctx.font = `${Math.max(10 / globalScale, 3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#e8e8e8';
          ctx.fillText(node.label, node.x, node.y + size + 2);
        }

        ctx.globalAlpha = 1;
      })
      .linkColor((link: any) => {
        if (highlightedNodes) {
          const srcId = typeof link.source === 'object' ? link.source.id : link.source;
          const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
          if (!highlightedNodes.has(srcId) || !highlightedNodes.has(tgtId)) return '#111';
        }
        return '#2a2a2a';
      })
      .linkWidth((link: any) => {
        if (highlightedNodes) {
          const srcId = typeof link.source === 'object' ? link.source.id : link.source;
          const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
          if (highlightedNodes.has(srcId) && highlightedNodes.has(tgtId)) return 1.5;
        }
        return 0.5;
      })
      .onNodeHover((node: any, prev: any) => {
        container.style.cursor = node ? 'pointer' : 'default';
        if (node) {
          hoveredNode = node;
          highlightedNodes = getConnectedSubgraph(graphData, node.id);
        } else {
          hoveredNode = null;
          highlightedNodes = null;
        }
      })
      .onNodeClick((node: any) => {
        onNodeClick?.(node);
      })
      .onBackgroundClick(() => {
        highlightedNodes = null;
      })
      .warmupTicks(50)
      .cooldownTicks(100)
      .d3AlphaDecay(0.02)
      .d3VelocityDecay(0.3);

    // Track mouse for tooltip
    container.addEventListener('mousemove', (e) => {
      tooltipX = e.offsetX;
      tooltipY = e.offsetY;
    });

    rebuildGraph();

    // Handle resize
    const observer = new ResizeObserver(() => {
      if (graph && container) {
        graph.width(container.clientWidth);
        graph.height(container.clientHeight);
      }
    });
    observer.observe(container);

    return () => observer.disconnect();
  });

  onDestroy(() => {
    if (graph) {
      graph._destructor?.();
    }
  });

  export function zoomToNode(nodeId: string) {
    if (!graph) return;
    const node = graphData.nodes.find((n) => n.id === nodeId);
    if (node) {
      graph.centerAt((node as any).x, (node as any).y, 500);
      graph.zoom(3, 500);
    }
  }
</script>

<div class="relative h-full w-full" bind:this={container}>
  {#if hoveredNode}
    {@const tooltipNode = hoveredNode}
    <div
      class="pointer-events-none absolute z-50 rounded-lg border border-border bg-bg-card/95 p-3 shadow-xl backdrop-blur-sm"
      style="left: {tooltipX + 12}px; top: {tooltipY - 12}px; max-width: 240px;"
    >
      <div class="flex items-center gap-2">
        <span
          class="inline-block h-2 w-2 rounded-full"
          style="background-color: {NODE_COLORS[tooltipNode.type] || '#888'}"
        ></span>
        <span class="text-[10px] font-medium uppercase text-text-dim">
          {tooltipNode.type}
        </span>
      </div>
      <div class="mt-1 text-sm font-medium">{tooltipNode.label}</div>
      {#if tooltipNode.size && tooltipNode.size > 1}
        <div class="mt-0.5 text-xs text-text-muted">{tooltipNode.size} connections</div>
      {/if}
    </div>
  {/if}
</div>
