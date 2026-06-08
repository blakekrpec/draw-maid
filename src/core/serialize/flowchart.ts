/**
 * Serializer: Diagram model -> Mermaid flowchart text.
 *
 * This is the "interesting" part of the app and the reason `core/` is kept
 * framework-free: it's pure string generation that can be unit-tested in
 * isolation. See flowchart.test.ts.
 */

import type { Diagram, DiagramEdge, DiagramNode, Subgraph } from '../model/types';

/** Mermaid treats `"` specially inside quoted labels; `#quot;` is its escape. */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;');
}

/** Wraps a node id + label in the delimiters that give it its shape. */
function nodeDeclaration(node: DiagramNode): string {
  const text = `"${escapeLabel(node.label)}"`;
  switch (node.shape) {
    case 'rectangle':
      return `${node.id}[${text}]`;
    case 'rounded':
      return `${node.id}(${text})`;
    case 'stadium':
      return `${node.id}([${text}])`;
    case 'circle':
      return `${node.id}((${text}))`;
    case 'diamond':
      return `${node.id}{${text}}`;
  }
}

function edgeLine(edge: DiagramEdge): string {
  const { source, target, dir } = edge;
  // Mermaid puts the label inside pipes immediately after the connector.
  const label =
    edge.label && edge.label.trim() !== '' ? `|"${escapeLabel(edge.label)}"|` : '';
  switch (dir) {
    case 'forward':
      return `${source} -->${label} ${target}`;
    // Mermaid has no single left-arrow, so emit a forward arrow with the
    // endpoints swapped — visually identical to "target points back at source".
    case 'back':
      return `${target} -->${label} ${source}`;
    case 'both':
      return `${source} <-->${label} ${target}`;
    case 'none':
      return `${source} ---${label} ${target}`;
  }
}

export function serializeFlowchart(diagram: Diagram): string {
  const lines: string[] = [`flowchart ${diagram.direction}`];
  const subgraphIds = new Set(diagram.subgraphs.map((s) => s.id));

  const nodesIn = (subgraphId: string | undefined) =>
    diagram.nodes.filter((n) => n.subgraphId === subgraphId);
  const childSubgraphs = (parentId: string | undefined) =>
    diagram.subgraphs.filter((s) => s.parentId === parentId);

  const emitSubgraph = (subgraph: Subgraph, indent: string) => {
    lines.push(`${indent}subgraph ${subgraph.id} ["${escapeLabel(subgraph.label)}"]`);
    for (const node of nodesIn(subgraph.id)) lines.push(`${indent}  ${nodeDeclaration(node)}`);
    for (const child of childSubgraphs(subgraph.id)) emitSubgraph(child, `${indent}  `);
    lines.push(`${indent}end`);
  };

  // Top-level nodes — those not in a (still-existing) subgraph. Declare them
  // explicitly so shape/label is always emitted, even for nodes only in edges.
  for (const node of diagram.nodes) {
    if (!node.subgraphId || !subgraphIds.has(node.subgraphId)) {
      lines.push(`  ${nodeDeclaration(node)}`);
    }
  }
  // Top-level subgraphs, each recursively emitting its members + nested groups.
  for (const subgraph of childSubgraphs(undefined)) emitSubgraph(subgraph, '  ');
  // All edges are emitted at the top level; valid regardless of grouping.
  for (const edge of diagram.edges) lines.push(`  ${edgeLine(edge)}`);

  return lines.join('\n');
}
