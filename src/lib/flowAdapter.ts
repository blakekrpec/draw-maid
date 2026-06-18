/**
 * Adapter between React Flow's node/edge shapes (the live editing state held in
 * the store) and the framework-free core `Diagram` (used for serialization and
 * import/export). `core/` must never import this.
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
  /** Mirrors the Mermaid `direction` keyword inside a subgraph. */
  direction?: FlowDirection;
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

// ── Shared helpers ──────────────────────────────────────────────────────────

export const byId = (nodes: FlowNode[]) => new Map(nodes.map((n) => [n.id, n]));

function nestingDepth(node: FlowNode, nodes: Map<string, FlowNode>): number {
  let depth = 0;
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId && nodes.has(parentId) && !seen.has(parentId)) {
    seen.add(parentId);
    depth++;
    parentId = nodes.get(parentId)!.parentId;
  }
  return depth;
}

/** React Flow requires every parent to appear before its children in the array. */
export function sortParentsFirst(nodes: FlowNode[]): FlowNode[] {
  const map = byId(nodes);
  return [...nodes].sort((a, b) => nestingDepth(a, map) - nestingDepth(b, map));
}

// ── flowToDiagram ────────────────────────────────────────────────────────────

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
      direction: g.data.direction,
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

// ── diagramToFlow ────────────────────────────────────────────────────────────

type Vec2 = { x: number; y: number };

/**
 * Pick the handle pair (one side of each node) that gives the shortest
 * straight-line distance between the two nodes.
 *
 * Handles are identified by the Position strings React Flow uses: "top",
 * "right", "bottom", "left" — matching the `id` set on each <Handle> in
 * ShapeNode.
 */
function bestHandles(
  src: Vec2,
  tgt: Vec2,
): { sourceHandle: string; targetHandle: string } {
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' };
  }
  return dy >= 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' };
}

// Estimated rendered node dimensions (generous; real size depends on the label).
const NODE_W = 130;
const NODE_H = 44;
const GROUP_PAD_X = 60; // padding on each side inside the group (increased from 40)
const GROUP_PAD_Y = 70; // padding top/bottom (increased from 50)
const LABEL_H = 24;     // height reserved for the subgraph label at the top

/**
 * Compute the minimum group (subgraph container) dimensions needed to hold
 * the given child nodes and child subgraphs at their assigned relative positions.
 */
function requiredGroupSize(
  childNodes: { position: Vec2 }[],
  childSubgraphs: Array<{ position: Vec2; width: number; height: number }> = [],
): { width: number; height: number } {
  if (childNodes.length === 0 && childSubgraphs.length === 0) {
    return { width: 200, height: 120 };
  }
  
  const items: Array<{ x: number; y: number; w: number; h: number }> = [
    ...childNodes.map((n) => ({ x: n.position.x, y: n.position.y, w: NODE_W, h: NODE_H })),
    ...childSubgraphs.map((sg) => ({ x: sg.position.x, y: sg.position.y, w: sg.width, h: sg.height })),
  ];
  
  if (items.length === 0) return { width: 200, height: 120 };
  
  const maxX = Math.max(...items.map((item) => item.x + item.w));
  const maxY = Math.max(...items.map((item) => item.y + item.h));
  
  return {
    width: Math.max(200, maxX + GROUP_PAD_X),
    height: Math.max(120, maxY + GROUP_PAD_Y + LABEL_H),
  };
}

/** Convert a pure Diagram model back into React Flow nodes and edges. */
export function diagramToFlow(diagram: Diagram): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const { direction } = diagram;
  const horizontal = direction === 'LR' || direction === 'RL';

  const allNodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Absolute positions keyed by node/group id — needed for handle computation.
  const absPos = new Map<string, Vec2>();
  
  // Z-index counter for proper layering (increments as we add nodes)
  let zIndex = 0;

  // ── Calculate sizes for all subgraphs (bottom-up, deepest first) ────────────
  const subgraphSizes = new Map<string, { width: number; height: number }>();
  
  // Build a map of subgraph children
  const subgraphChildren = new Map<string, string[]>();
  for (const sg of diagram.subgraphs) {
    if (sg.parentId) {
      const siblings = subgraphChildren.get(sg.parentId) || [];
      siblings.push(sg.id);
      subgraphChildren.set(sg.parentId, siblings);
    }
  }
  
  // Calculate sizes recursively from deepest to shallowest
  const calculateSubgraphSize = (sgId: string): { width: number; height: number } => {
    if (subgraphSizes.has(sgId)) return subgraphSizes.get(sgId)!;
    
    // Get direct child nodes
    const childNodes = diagram.nodes.filter((n) => n.subgraphId === sgId);
    
    // Get direct child subgraphs and calculate their sizes first (recursion)
    const childSgIds = subgraphChildren.get(sgId) || [];
    const childSubgraphs = childSgIds.map((childId) => {
      const childSize = calculateSubgraphSize(childId);
      // Use a default relative position for nested subgraphs during size calculation
      // Increased spacing: was 20 + i*16, now 30 + i*24
      const childIndex = childSgIds.indexOf(childId);
      return {
        position: { x: 30 + childIndex * 24, y: 50 + childIndex * 24 },
        width: childSize.width,
        height: childSize.height,
      };
    });
    
    const size = requiredGroupSize(childNodes, childSubgraphs);
    subgraphSizes.set(sgId, size);
    return size;
  };
  
  // Calculate all subgraph sizes
  for (const sg of diagram.subgraphs) {
    calculateSubgraphSize(sg.id);
  }

  // ── Lay out top-level items (subgraphs then nodes) along the primary axis ───
  const topSubs = diagram.subgraphs.filter((s) => !s.parentId);
  const nestedSubs = diagram.subgraphs.filter((s) => s.parentId);
  const topNodes = diagram.nodes.filter((n) => !n.subgraphId);
  
  const ITEM_GAP = 120; // gap between consecutive items (increased from 80)
  let cursor = 100; // starting position (increased from 80)

  // Maximum cross-axis size among subgraphs (used to centre nodes alongside them).
  const maxSgCross = topSubs.length
    ? Math.max(...topSubs.map((sg) => (horizontal ? subgraphSizes.get(sg.id)!.height : subgraphSizes.get(sg.id)!.width)))
    : 0;

  // Subgraph containers
  for (const sg of topSubs) {
    const { width, height } = subgraphSizes.get(sg.id)!;
    const pos: Vec2 = horizontal
      ? { x: cursor, y: 50 }
      : { x: 50, y: cursor };
    absPos.set(sg.id, pos);
    allNodes.push({
      id: sg.id,
      type: 'group',
      position: pos,
      data: { label: sg.label, ...(sg.direction ? { direction: sg.direction } : {}) },
      style: { width, height },
      zIndex: zIndex++,
    } as GroupFlowNode);
    cursor += (horizontal ? width : height) + ITEM_GAP;
  }

  // Top-level shape nodes, centred on the cross axis relative to the tallest subgraph
  const nodeCrossOffset = Math.max(0, Math.round((maxSgCross - NODE_H) / 2));
  for (const n of topNodes) {
    const pos: Vec2 = horizontal
      ? { x: cursor, y: 50 + nodeCrossOffset }
      : { x: 50 + nodeCrossOffset, y: cursor };
    absPos.set(n.id, pos);
    allNodes.push({
      id: n.id,
      type: 'shape',
      position: pos,
      data: { label: n.label, shape: n.shape },
      zIndex: zIndex++,
    } as ShapeFlowNode);
    cursor += (horizontal ? NODE_W : NODE_H) + ITEM_GAP;
  }

  // ── Nested subgraphs (place relative to their parent) ───────────────────────
  for (let i = 0; i < nestedSubs.length; i++) {
    const sg = nestedSubs[i];
    const { width, height } = subgraphSizes.get(sg.id)!;
    // Increased spacing: was 20 + i*16, now 30 + i*24
    const relPos: Vec2 = { x: 30 + i * 24, y: 50 + i * 24 };
    const parentAbs = absPos.get(sg.parentId!) ?? { x: 0, y: 0 };
    absPos.set(sg.id, { x: parentAbs.x + relPos.x, y: parentAbs.y + relPos.y });
    allNodes.push({
      id: sg.id,
      type: 'group',
      position: relPos,
      data: { label: sg.label, ...(sg.direction ? { direction: sg.direction } : {}) },
      style: { width, height },
      parentId: sg.parentId,
      extent: 'parent',
      zIndex: zIndex++,
    } as GroupFlowNode);
  }

  // ── Child shape nodes (positions are relative, set by the parser) ────────────
  for (const n of diagram.nodes.filter((n) => n.subgraphId)) {
    const parentAbs = absPos.get(n.subgraphId!) ?? { x: 0, y: 0 };
    absPos.set(n.id, { x: parentAbs.x + n.position.x, y: parentAbs.y + n.position.y });
    allNodes.push({
      id: n.id,
      type: 'shape',
      position: n.position,
      data: { label: n.label, shape: n.shape },
      parentId: n.subgraphId,
      extent: 'parent' as const,
      zIndex: zIndex++,
    } as ShapeFlowNode);
  }

  // ── Edges with shortest-path handles ────────────────────────────────────────
  for (const e of diagram.edges) {
    const srcPos = absPos.get(e.source) ?? { x: 0, y: 0 };
    const tgtPos = absPos.get(e.target) ?? { x: 0, y: 0 };
    const handles = bestHandles(srcPos, tgtPos);
    edges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      ...handles,
      data: { dir: e.dir },
      ...(e.label !== undefined ? { label: e.label } : {}),
    });
  }

  return { nodes: sortParentsFirst(allNodes), edges };
}
