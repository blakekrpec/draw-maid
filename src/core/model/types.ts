/**
 * The diagram model — the single source of truth for the whole app.
 *
 * IMPORTANT: nothing in `core/` may import React, the store, or any UI code.
 * These are plain data structures + pure functions, fully unit-testable on
 * their own. The UI is built on top of this; this never depends on the UI.
 */

/** Which kind of Mermaid diagram this is. (More types can be added later.) */
export type DiagramType = 'flowchart';

/** Flowchart layout direction, as understood by Mermaid. */
export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL';

/** The visual shape of a node. Affects the generated Mermaid syntax. */
export type NodeShape = 'rectangle' | 'rounded' | 'stadium' | 'circle' | 'diamond';

/**
 * Which way the arrowheads point on an edge.
 *  - forward: source --> target
 *  - back:    target --> source (i.e. the arrow points back at the source)
 *  - both:    source <--> target
 *  - none:    source --- target (a plain line, no arrowheads)
 */
export type EdgeDir = 'forward' | 'back' | 'both' | 'none';

export interface Position {
  x: number;
  y: number;
}

export interface DiagramNode {
  /** Stable, Mermaid-safe id, e.g. "n1". Generated; never contains spaces. */
  id: string;
  label: string;
  shape: NodeShape;
  position: Position;
  /** Id of the subgraph this node belongs to, if any. */
  subgraphId?: string;
}

/** A `subgraph … end` group. `parentId` allows subgraphs nested in subgraphs. */
export interface Subgraph {
  /** Stable, Mermaid-safe id, e.g. "s1". */
  id: string;
  label: string;
  /** Id of the enclosing subgraph, if this one is nested. */
  parentId?: string;
  /** Optional layout direction override inside this subgraph (emitted as `direction LR` etc). */
  direction?: FlowDirection;
}

export interface DiagramEdge {
  /** Stable id, e.g. "e1". */
  id: string;
  /** Source node id. */
  source: string;
  /** Target node id. */
  target: string;
  /** Which way the arrowheads point. */
  dir: EdgeDir;
  /** Optional text rendered on the connector. */
  label?: string;
}

export interface Diagram {
  type: DiagramType;
  direction: FlowDirection;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  subgraphs: Subgraph[];
}

/** A fresh, empty flowchart. */
export function emptyDiagram(): Diagram {
  return {
    type: 'flowchart',
    direction: 'TB',
    subgraphs: [],
    nodes: [],
    edges: [],
  };
}
