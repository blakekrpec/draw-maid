/**
 * Adapter between React Flow's node/edge shapes (the live editing state held in
 * the store) and the framework-free core `Diagram` (used for serialization and,
 * later, persistence/import). `core/` must never import this.
 *
 * Two kinds of node live in the same React Flow array:
 *  - shape nodes  (type 'shape') — the actual flowchart boxes.
 *  - group nodes  (type 'group') — the visual container for a Mermaid subgraph.
 * A shape node's `parentId` is its subgraph; a group node's `parentId` is its
 * enclosing subgraph (for nesting).
 */

import type { Edge, Node } from '@xyflow/react';
import type { Diagram, EdgeDir, FlowDirection, NodeShape } from '../core';

export type FlowNodeData = Record<string, unknown> & {
  label: string;
  shape: NodeShape;
};

export type GroupNodeData = Record<string, unknown> & {
  label: string;
};

export type FlowEdgeData = Record<string, unknown> & {
  dir: EdgeDir;
};

export type ShapeFlowNode = Node<FlowNodeData, 'shape'>;
export type GroupFlowNode = Node<GroupNodeData, 'group'>;
export type FlowNode = ShapeFlowNode | GroupFlowNode;
export type FlowEdge = Edge<FlowEdgeData>;

export const isShapeNode = (n: FlowNode): n is ShapeFlowNode => n.type === 'shape';
export const isGroupNode = (n: FlowNode): n is GroupFlowNode => n.type === 'group';

/** Convert the live React Flow state into the pure domain model. */
export function flowToDiagram(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: FlowDirection,
): Diagram {
  return {
    type: 'flowchart',
    direction,
    subgraphs: nodes.filter(isGroupNode).map((g) => ({
      id: g.id,
      label: g.data.label,
      parentId: g.parentId,
    })),
    nodes: nodes.filter(isShapeNode).map((n) => ({
      id: n.id,
      label: n.data.label,
      shape: n.data.shape,
      position: n.position,
      subgraphId: n.parentId,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      dir: e.data?.dir ?? 'forward',
      label: typeof e.label === 'string' ? e.label : undefined,
    })),
  };
}
