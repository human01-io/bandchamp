import type { Album } from '../types/album.js';
import type { GraphNode, GraphEdge, GraphData } from '../types/graph.js';

export interface GraphOptions {
  showAlbums: boolean;
  showArtists: boolean;
  showTags: boolean;
  showLabels: boolean;
  minConnections: number;
  maxNodes: number;
}

const defaultOptions: GraphOptions = {
  showAlbums: true,
  showArtists: true,
  showTags: true,
  showLabels: false,
  minConnections: 1,
  maxNodes: 500,
};

export function buildGraphData(albums: Album[], opts: Partial<GraphOptions> = {}): GraphData {
  const options = { ...defaultOptions, ...opts };
  const nodes: Map<string, GraphNode> = new Map();
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  function addNode(id: string, type: GraphNode['type'], label: string, imageUrl?: string) {
    if (!nodes.has(id)) {
      nodes.set(id, { id, type, label, imageUrl, size: 0 });
    }
    const node = nodes.get(id)!;
    node.size = (node.size || 0) + 1;
  }

  function addEdge(source: string, target: string, type: GraphEdge['type']) {
    const key = [source, target].sort().join('|');
    if (edgeSet.has(key)) {
      // Increment weight
      const existing = edges.find(
        (e) =>
          ([e.source, e.target].sort().join('|') === key) && e.type === type,
      );
      if (existing) existing.weight++;
      return;
    }
    edgeSet.add(key);
    edges.push({ source, target, type, weight: 1 });
  }

  for (const album of albums) {
    const albumNodeId = `album:${album.id}`;

    if (options.showAlbums) {
      addNode(albumNodeId, 'album', album.title, album.coverArtUrl);
    }

    // Artist nodes and edges
    if (options.showArtists) {
      const artistNodeId = `artist:${album.artistId}`;
      addNode(artistNodeId, 'artist', album.artistName);
      if (options.showAlbums) {
        addEdge(albumNodeId, artistNodeId, 'artist');
      }
    }

    // Tag nodes and edges
    if (options.showTags) {
      const allTags = [...album.tags, ...album.userTags];
      const uniqueTags = [...new Set(allTags)];
      for (const tag of uniqueTags) {
        const tagNodeId = `tag:${tag}`;
        addNode(tagNodeId, 'tag', tag);
        if (options.showAlbums) {
          addEdge(albumNodeId, tagNodeId, 'tag');
        }
        // Connect tag to artist
        if (options.showArtists) {
          addEdge(`artist:${album.artistId}`, tagNodeId, 'tag');
        }
      }
    }

    // Label nodes and edges
    if (options.showLabels && album.labelName) {
      const labelNodeId = `label:${album.labelName}`;
      addNode(labelNodeId, 'label', album.labelName);
      if (options.showAlbums) {
        addEdge(albumNodeId, labelNodeId, 'label');
      }
      if (options.showArtists) {
        addEdge(`artist:${album.artistId}`, labelNodeId, 'label');
      }
    }
  }

  // Connect artists that share tags (artist-to-artist via shared tags)
  if (options.showArtists && !options.showTags) {
    const artistTags = new Map<string, Set<string>>();
    for (const album of albums) {
      const key = `artist:${album.artistId}`;
      if (!artistTags.has(key)) artistTags.set(key, new Set());
      const tags = artistTags.get(key)!;
      for (const tag of [...album.tags, ...album.userTags]) {
        tags.add(tag);
      }
    }

    const artistIds = [...artistTags.keys()];
    for (let i = 0; i < artistIds.length; i++) {
      for (let j = i + 1; j < artistIds.length; j++) {
        const tagsA = artistTags.get(artistIds[i])!;
        const tagsB = artistTags.get(artistIds[j])!;
        let shared = 0;
        for (const tag of tagsA) {
          if (tagsB.has(tag)) shared++;
        }
        if (shared >= 2) {
          addEdge(artistIds[i], artistIds[j], 'genre');
        }
      }
    }
  }

  // Filter by min connections
  let nodeArray = Array.from(nodes.values());
  if (options.minConnections > 1) {
    const connectionCount = new Map<string, number>();
    for (const edge of edges) {
      connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
      connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
    }
    const keepIds = new Set(
      nodeArray
        .filter((n) => (connectionCount.get(n.id) || 0) >= options.minConnections)
        .map((n) => n.id),
    );
    nodeArray = nodeArray.filter((n) => keepIds.has(n.id));
    // Also filter edges
    const validEdges = edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target));
    edges.length = 0;
    edges.push(...validEdges);
  }

  // Cap max nodes (keep most connected)
  if (nodeArray.length > options.maxNodes) {
    nodeArray.sort((a, b) => (b.size || 0) - (a.size || 0));
    nodeArray = nodeArray.slice(0, options.maxNodes);
    const keepIds = new Set(nodeArray.map((n) => n.id));
    const validEdges = edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target));
    edges.length = 0;
    edges.push(...validEdges);
  }

  return { nodes: nodeArray, edges };
}

export function getConnectedSubgraph(data: GraphData, nodeId: string): Set<string> {
  const connected = new Set<string>([nodeId]);
  for (const edge of data.edges) {
    if (edge.source === nodeId) connected.add(edge.target);
    if (edge.target === nodeId) connected.add(edge.source);
  }
  return connected;
}
