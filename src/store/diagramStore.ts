/**
 * The single global store.
 *
 * It holds React Flow's nodes/edges as the live editing state — letting the
 * library manage node measurement, dragging and selection — plus the flowchart
 * direction. The pure `core` serializer is fed via `flowToDiagram`, so all the
 * "interesting" logic stays framework-free and unit-tested.
 *
 * Subgraphs are modelled as React Flow group nodes; a node "belongs" to a
 * subgraph via its `parentId`. Edges may target a subgraph (its group id) too.
 *
 * Undo/redo: mutating actions call `record()` before changing state, snapshotting
 * the previous {nodes, edges, direction}. Rapid same-kind edits (e.g. typing a
 * label) are coalesced into a single step.
 */

import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import {
  nextEdgeId,
  nextNodeId,
  nextSubgraphId,
  serialize,
  type EdgeDir,
  type FlowDirection,
  type NodeShape,
} from '../core';
import {
  flowToDiagram,
  isGroupNode,
  isShapeNode,
  type FlowEdge,
  type FlowNode,
  type GroupFlowNode,
  type ShapeFlowNode,
} from '../lib/flowAdapter';

const byId = (nodes: FlowNode[]) => new Map(nodes.map((n) => [n.id, n]));

/** A node's absolute position (React Flow stores child positions relative to the parent). */
function absolutePosition(node: FlowNode, nodes: Map<string, FlowNode>) {
  let { x, y } = node.position;
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId && nodes.has(parentId) && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = nodes.get(parentId)!;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

function nestingDepth(node: FlowNode, nodes: Map<string, FlowNode>) {
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
function sortParentsFirst(nodes: FlowNode[]): FlowNode[] {
  const map = byId(nodes);
  return [...nodes].sort((a, b) => nestingDepth(a, map) - nestingDepth(b, map));
}

interface Snapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction: FlowDirection;
}

const MAX_HISTORY = 100;
const COALESCE_MS = 600;

export type InteractionMode = 'pan' | 'select';

interface DiagramState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction: FlowDirection;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  past: Snapshot[];
  future: Snapshot[];

  // UI (not part of undo history)
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  toggleMode: () => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;

  /** Generated Mermaid source for the current diagram. */
  code: () => string;

  // Node actions
  addNode: () => void;
  updateNodeLabel: (id: string, label: string) => void;
  setNodeShape: (id: string, shape: NodeShape) => void;
  setNodeSubgraph: (nodeId: string, subgraphId: string | null) => void;
  removeNode: (id: string) => void;

  // Subgraph actions
  addSubgraph: () => void;
  updateSubgraphLabel: (id: string, label: string) => void;
  removeSubgraph: (id: string) => void;

  // Edge actions
  onConnect: (connection: Connection) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  setEdgeDir: (id: string, dir: EdgeDir) => void;
  removeEdge: (id: string) => void;

  // React Flow change handlers (dragging, measurement, deletion, selection)
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  /** Snapshot before a drag so the whole drag is one undo step. */
  beginInteraction: () => void;

  // Selection (mirrored for the Inspector)
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  /** Replace the node selection (used by the right-drag marquee). */
  setSelectedNodes: (ids: string[]) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Diagram-level
  setDirection: (direction: FlowDirection) => void;
  clear: () => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => {
  // Coalescing bookkeeping for the undo history (single store instance).
  let lastKey: string | null = null;
  let lastTime = 0;

  /**
   * Snapshot the current state onto the undo stack. Pass a `key` for edits that
   * should coalesce (rapid typing in one field); omit it for discrete actions.
   */
  const record = (key?: string) => {
    const now = Date.now();
    if (key !== undefined && key === lastKey && now - lastTime < COALESCE_MS) {
      lastTime = now;
      return;
    }
    lastKey = key ?? null;
    lastTime = now;
    const s = get();
    set({
      past: [...s.past, { nodes: s.nodes, edges: s.edges, direction: s.direction }].slice(
        -MAX_HISTORY,
      ),
      future: [],
    });
  };

  return {
    nodes: [],
    edges: [],
    direction: 'TB',
    selectedNodeId: null,
    selectedEdgeId: null,
    past: [],
    future: [],

    mode: 'pan',
    setMode: (mode) => set({ mode }),
    toggleMode: () => set((s) => ({ mode: s.mode === 'pan' ? 'select' : 'pan' })),
    helpOpen: false,
    setHelpOpen: (helpOpen) => set({ helpOpen }),

    code: () => serialize(flowToDiagram(get().nodes, get().edges, get().direction)),

    addNode: () => {
      record();
      const { nodes } = get();
      const count = nodes.filter(isShapeNode).length;
      const node: ShapeFlowNode = {
        id: nextNodeId(nodes),
        type: 'shape',
        // Loose grid so new nodes don't stack on top of each other.
        position: { x: 80 + (count % 4) * 200, y: 80 + Math.floor(count / 4) * 130 },
        data: { label: 'New node', shape: 'rectangle' },
        selected: true,
      };
      set((s) => ({
        nodes: sortParentsFirst([...s.nodes.map((n) => ({ ...n, selected: false })), node]),
        selectedNodeId: node.id,
        selectedEdgeId: null,
      }));
    },

    updateNodeLabel: (id, label) => {
      record(`label:${id}`);
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && isShapeNode(n) ? { ...n, data: { ...n.data, label } } : n,
        ),
      }));
    },

    setNodeShape: (id, shape) => {
      record();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && isShapeNode(n) ? { ...n, data: { ...n.data, shape } } : n,
        ),
      }));
    },

    setNodeSubgraph: (nodeId, subgraphId) => {
      record();
      set((s) => {
        const map = byId(s.nodes);
        const node = map.get(nodeId);
        if (!node) return {};
        // Convert to an absolute position, then re-relativise to the new parent
        // so the node stays visually put when its grouping changes.
        const abs = absolutePosition(node, map);
        let position = abs;
        let parentId: string | undefined;
        let extent: 'parent' | undefined;
        const group = subgraphId ? map.get(subgraphId) : undefined;
        if (group) {
          const groupAbs = absolutePosition(group, map);
          position = { x: abs.x - groupAbs.x, y: abs.y - groupAbs.y };
          parentId = subgraphId ?? undefined;
          extent = 'parent';
        }
        const nodes = s.nodes.map((n) =>
          n.id === nodeId ? { ...n, position, parentId, extent } : n,
        );
        return { nodes: sortParentsFirst(nodes) };
      });
    },

    removeNode: (id) => {
      record();
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      }));
    },

    addSubgraph: () => {
      record();
      const groups = get().nodes.filter(isGroupNode);
      const group: GroupFlowNode = {
        id: nextSubgraphId(groups),
        type: 'group',
        position: { x: 40 + groups.length * 32, y: 40 + groups.length * 32 },
        data: { label: 'Subgraph' },
        style: { width: 340, height: 240 },
        selected: true,
      };
      set((s) => ({
        nodes: sortParentsFirst([group, ...s.nodes.map((n) => ({ ...n, selected: false }))]),
        selectedNodeId: group.id,
        selectedEdgeId: null,
      }));
    },

    updateSubgraphLabel: (id, label) => {
      record(`sglabel:${id}`);
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && isGroupNode(n) ? { ...n, data: { ...n.data, label } } : n,
        ),
      }));
    },

    removeSubgraph: (id) => {
      record();
      set((s) => {
        const map = byId(s.nodes);
        const nodes = s.nodes
          .filter((n) => n.id !== id)
          .map((n) =>
            n.parentId === id
              ? { ...n, position: absolutePosition(n, map), parentId: undefined, extent: undefined }
              : n,
          );
        return {
          nodes: sortParentsFirst(nodes),
          // Drop edges that connected to the subgraph itself.
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        };
      });
    },

    onConnect: (connection) => {
      if (!connection.source || !connection.target) return;
      record();
      set((s) => ({
        edges: addEdge<FlowEdge>(
          { ...connection, id: nextEdgeId(s.edges), data: { dir: 'forward' } },
          s.edges,
        ),
      }));
    },

    updateEdgeLabel: (id, label) => {
      record(`elabel:${id}`);
      set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, label } : e)) }));
    },

    setEdgeDir: (id, dir) => {
      record();
      set((s) => ({
        edges: s.edges.map((e) => (e.id === id ? { ...e, data: { ...e.data, dir } } : e)),
      }));
    },

    removeEdge: (id) => {
      record();
      set((s) => ({
        edges: s.edges.filter((e) => e.id !== id),
        selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
      }));
    },

    beginInteraction: () => record(),

    onNodesChange: (changes) => {
      const removals = changes.filter((c) => c.type === 'remove');
      // Coalesce the node+edge removals React Flow emits for one delete press.
      if (removals.length) record('delete');
      const oldMap = byId(get().nodes);
      let nodes = applyNodeChanges<FlowNode>(changes, get().nodes);
      if (removals.length) {
        // Un-group any node whose parent (a deleted subgraph) just disappeared.
        const removed = new Set(removals.map((c) => c.id));
        nodes = nodes.map((n) =>
          n.parentId && removed.has(n.parentId)
            ? {
                ...n,
                position: absolutePosition(oldMap.get(n.id) ?? n, oldMap),
                parentId: undefined,
                extent: undefined,
              }
            : n,
        );
        nodes = sortParentsFirst(nodes);
      }
      set((s) => ({
        nodes,
        selectedNodeId:
          s.selectedNodeId && !nodes.some((n) => n.id === s.selectedNodeId)
            ? null
            : s.selectedNodeId,
      }));
    },

    onEdgesChange: (changes) => {
      const removals = changes.filter((c) => c.type === 'remove');
      if (removals.length) record('delete');
      const edges = applyEdgeChanges<FlowEdge>(changes, get().edges);
      set((s) => ({
        edges,
        selectedEdgeId:
          s.selectedEdgeId && !edges.some((e) => e.id === s.selectedEdgeId)
            ? null
            : s.selectedEdgeId,
      }));
    },

    selectNode: (id) => set({ selectedNodeId: id }),
    selectEdge: (id) => set({ selectedEdgeId: id }),

    setSelectedNodes: (ids) => {
      const idSet = new Set(ids);
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.selected === idSet.has(n.id) ? n : { ...n, selected: idSet.has(n.id) },
        ),
        edges: s.edges.some((e) => e.selected)
          ? s.edges.map((e) => (e.selected ? { ...e, selected: false } : e))
          : s.edges,
        selectedNodeId: ids.length === 1 ? ids[0] : null,
        selectedEdgeId: null,
      }));
    },

    undo: () => {
      const s = get();
      if (s.past.length === 0) return;
      lastKey = null;
      const previous = s.past[s.past.length - 1];
      set({
        ...previous,
        past: s.past.slice(0, -1),
        future: [{ nodes: s.nodes, edges: s.edges, direction: s.direction }, ...s.future].slice(
          0,
          MAX_HISTORY,
        ),
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    },

    redo: () => {
      const s = get();
      if (s.future.length === 0) return;
      lastKey = null;
      const next = s.future[0];
      set({
        ...next,
        past: [...s.past, { nodes: s.nodes, edges: s.edges, direction: s.direction }].slice(
          -MAX_HISTORY,
        ),
        future: s.future.slice(1),
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    },

    setDirection: (direction) => {
      record();
      set({ direction });
    },

    clear: () => {
      record();
      set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null });
    },
  };
});
