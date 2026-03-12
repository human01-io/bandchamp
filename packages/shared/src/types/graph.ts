export type GraphNodeType = 'album' | 'artist' | 'tag' | 'label';
export type GraphEdgeType = 'artist' | 'tag' | 'label' | 'genre';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  imageUrl?: string;
  size?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
