/**
 * Parser: Mermaid flowchart text → Diagram model.
 *
 * Best-effort: handles the subset draw-maid generates plus common hand-written
 * flowcharts. Unknown or exotic syntax is silently skipped rather than crashing.
 */

import type {
  Diagram,
  DiagramEdge,
  DiagramNode,
  EdgeDir,
  FlowDirection,
  NodeShape,
  Subgraph,
} from '../model/types';

function unescapeLabel(s: string): string {
  return s.replace(/#quot;/g, '"');
}

/** Parse a single token that should be a node declaration or bare id. */
function parseNodeToken(token: string): { id: string; label: string; shape: NodeShape } | null {
  const t = token.trim();
  if (!t) return null;

  // Circle: id(("label"))
  let m = t.match(/^(\w+)\(\("([^"]*)"\)\)$/);
  if (m) return { id: m[1], label: unescapeLabel(m[2]), shape: 'circle' };

  // Stadium: id(["label"])
  m = t.match(/^(\w+)\(\["([^"]*)"\]\)$/);
  if (m) return { id: m[1], label: unescapeLabel(m[2]), shape: 'stadium' };

  // Rounded: id("label")
  m = t.match(/^(\w+)\("([^"]*)"\)$/);
  if (m) return { id: m[1], label: unescapeLabel(m[2]), shape: 'rounded' };

  // Diamond: id{"label"}
  m = t.match(/^(\w+)\{"([^"]*)"\}$/);
  if (m) return { id: m[1], label: unescapeLabel(m[2]), shape: 'diamond' };

  // Rectangle: id["label"] (quoted)
  m = t.match(/^(\w+)\["([^"]*)"\]$/);
  if (m) return { id: m[1], label: unescapeLabel(m[2]), shape: 'rectangle' };

  // Rectangle: id[label] (unquoted)
  m = t.match(/^(\w+)\[([^\]]+)\]$/);
  if (m) return { id: m[1], label: unescapeLabel(m[2].trim()), shape: 'rectangle' };

  // Bare alphanumeric id (implicit rectangular node)
  m = t.match(/^(\w+)$/);
  if (m && t !== 'end') return { id: m[1], label: m[1], shape: 'rectangle' };

  return null;
}

type EdgeResult = {
  id: string;
  source: string;
  /** Raw source token — may include shape decoration like n1["Login"]. */
  sourceToken: string;
  target: string;
  /** Raw target token — may include shape decoration. */
  targetToken: string;
  dir: EdgeDir;
  label?: string;
};

/**
 * Try to parse an edge line. Returns null if the line doesn't look like an edge.
 *
 * Handles the forms draw-maid generates:
 *   n1 --> n2
 *   n1 -->|"label"| n2
 *   n1 <--> n2
 *   n1 --- n2
 * Plus common hand-written Mermaid variants:
 *   a & b --> c       (multi-source)
 *   a --> b & c       (multi-target)
 *   n1["Label"] --> n2["Other"]  (inline node declarations)
 */
function tryParseEdge(line: string, counter: { n: number }): EdgeResult[] | null {
  if (!/<-->|-->|---/.test(line)) return null;

  const markerRe = /(<-->|-->|---)/;
  const markerMatch = line.match(markerRe);
  if (!markerMatch || markerMatch.index === undefined) return null;

  const markerStart = markerMatch.index;
  const marker = markerMatch[0];
  const sourcePart = line.slice(0, markerStart).trim();
  let rest = line.slice(markerStart + marker.length).trim();

  const dir: EdgeDir = marker === '<-->' ? 'both' : marker === '---' ? 'none' : 'forward';

  // Optional label: |"label"| or "label"| (draw-maid emits the latter)
  let edgeLabel: string | undefined;
  let labelMatch = rest.match(/^\|"([^"]*)"\|\s*(.*)/s);
  if (labelMatch) {
    edgeLabel = unescapeLabel(labelMatch[1]);
    rest = labelMatch[2].trim();
  } else {
    labelMatch = rest.match(/^"([^"]*)"\|\s*(.*)/s);
    if (labelMatch) {
      edgeLabel = unescapeLabel(labelMatch[1]);
      rest = labelMatch[2].trim();
    }
  }

  const targetPart = rest;

  // Split on & for multi-source / multi-target, keeping raw tokens for label extraction.
  const sourcePairs = sourcePart
    .split('&')
    .map((s) => s.trim())
    .map((tok) => {
      const id = tok.match(/^(\w+)/)?.[1] ?? null;
      return id ? { id, token: tok } : null;
    })
    .filter(Boolean) as { id: string; token: string }[];

  const targetPairs = targetPart
    .split('&')
    .map((t) => t.trim())
    .map((tok) => {
      const id = tok.match(/^(\w+)/)?.[1] ?? null;
      return id ? { id, token: tok } : null;
    })
    .filter(Boolean) as { id: string; token: string }[];

  if (sourcePairs.length === 0 || targetPairs.length === 0) return null;

  const results: EdgeResult[] = [];
  for (const { id: src, token: srcTok } of sourcePairs) {
    for (const { id: tgt, token: tgtTok } of targetPairs) {
      results.push({
        id: `e${counter.n++}`,
        source: src,
        sourceToken: srcTok,
        target: tgt,
        targetToken: tgtTok,
        dir,
        ...(edgeLabel !== undefined ? { label: edgeLabel } : {}),
      });
    }
  }
  return results;
}

/**
 * Assign relative positions to nodes inside subgraphs. Top-level node positions
 * are handled separately in diagramToFlow where we can account for subgraph sizes.
 */
function assignChildPositions(
  nodes: Map<string, DiagramNode>,
  subgraphs: Subgraph[],
  direction: FlowDirection,
): void {
  for (const sg of subgraphs) {
    const sgDir = sg.direction ?? direction;
    const sgHoriz = sgDir === 'LR' || sgDir === 'RL';
    const children = Array.from(nodes.values()).filter((n) => n.subgraphId === sg.id);
    children.forEach((n, i) => {
      if (sgHoriz) {
        n.position = { x: 20 + i * 180, y: 40 };
      } else {
        // TB: single column, wrap to a second column after WRAP nodes
        const WRAP = 5;
        const col = Math.floor(i / WRAP);
        const row = i % WRAP;
        n.position = { x: 20 + col * 200, y: 40 + row * 100 };
      }
    });
  }
}

/** Parse Mermaid flowchart text into a Diagram model. */
export function parseFlowchart(text: string): Diagram {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('%%'));

  let direction: FlowDirection = 'TB';
  const nodesMap = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  const subgraphs: Subgraph[] = [];
  const subgraphStack: string[] = [];
  const edgeCounter = { n: 1 };

  let startIdx = 0;
  const headerMatch = lines[0]?.match(/^(?:flowchart|graph)\s+(TB|BT|LR|RL)/i);
  if (headerMatch) {
    direction = headerMatch[1].toUpperCase() as FlowDirection;
    startIdx = 1;
  }

  /**
   * Create or update a node from a possibly-decorated endpoint token.
   * If the token is `n1["Login"]`, the node gets label "Login" and shape rectangle.
   * If it's a bare `n1`, we only create the node if it doesn't exist yet.
   */
  const upsertNodeFromToken = (token: string) => {
    const decl = parseNodeToken(token);
    if (!decl) return;
    const subgraphId = subgraphStack[subgraphStack.length - 1];
    const existing = nodesMap.get(decl.id);
    if (!existing) {
      nodesMap.set(decl.id, {
        id: decl.id,
        label: decl.label,
        shape: decl.shape,
        position: { x: 0, y: 0 },
        subgraphId,
      });
    } else {
      // If this token carries actual decoration (not just a bare id), update label/shape.
      if (decl.label !== decl.id || decl.shape !== 'rectangle') {
        existing.label = decl.label;
        existing.shape = decl.shape;
      }
    }
  };

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // Subgraph start: subgraph id ["label"] or subgraph id["label"] or subgraph id
    const sgMatch = line.match(/^subgraph\s+(\w+)(?:\s*\[["']?([^"'\]]*?)["']?\])?/);
    if (sgMatch) {
      const id = sgMatch[1];
      const label = sgMatch[2]?.trim() ?? id;
      const parentId = subgraphStack[subgraphStack.length - 1];
      subgraphs.push({ id, label, ...(parentId ? { parentId } : {}) });
      subgraphStack.push(id);
      continue;
    }

    // Direction inside subgraph
    const dirMatch = line.match(/^direction\s+(TB|BT|LR|RL)$/i);
    if (dirMatch && subgraphStack.length > 0) {
      const sgId = subgraphStack[subgraphStack.length - 1];
      const sg = subgraphs.find((s) => s.id === sgId);
      if (sg) sg.direction = dirMatch[1].toUpperCase() as FlowDirection;
      continue;
    }

    // End of subgraph
    if (line === 'end') {
      subgraphStack.pop();
      continue;
    }

    // Edge line? Parse it and upsert nodes from the decorated endpoint tokens.
    const edgeResults = tryParseEdge(line, edgeCounter);
    if (edgeResults) {
      for (const e of edgeResults) {
        upsertNodeFromToken(e.sourceToken);
        upsertNodeFromToken(e.targetToken);
        edges.push({ id: e.id, source: e.source, target: e.target, dir: e.dir, label: e.label });
      }
      continue;
    }

    // Standalone node declaration (inside or outside a subgraph)
    const nodeDecl = parseNodeToken(line);
    if (nodeDecl) {
      const existing = nodesMap.get(nodeDecl.id);
      if (existing) {
        existing.label = nodeDecl.label;
        existing.shape = nodeDecl.shape;
        if (subgraphStack.length > 0) existing.subgraphId = subgraphStack[subgraphStack.length - 1];
      } else {
        nodesMap.set(nodeDecl.id, {
          id: nodeDecl.id,
          label: nodeDecl.label,
          shape: nodeDecl.shape,
          position: { x: 0, y: 0 },
          subgraphId: subgraphStack[subgraphStack.length - 1],
        });
      }
    }
  }

  // Edges may reference a subgraph by id (`n1 --> s1`, `s1 --> s2`). Those bare
  // ids look exactly like implicit node declarations, so the upsert logic above
  // creates phantom rectangle nodes for them. A node and a subgraph can never
  // legitimately share an id in Mermaid, so drop any such collisions: the edge
  // keeps referencing the subgraph (React Flow connects to the group node).
  const subgraphIds = new Set(subgraphs.map((s) => s.id));
  for (const id of subgraphIds) nodesMap.delete(id);

  assignChildPositions(nodesMap, subgraphs, direction);

  return {
    type: 'flowchart',
    direction,
    nodes: Array.from(nodesMap.values()),
    edges,
    subgraphs,
  };
}
