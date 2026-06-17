import { useMemo } from 'react';
import { useDiagramStore } from '../../store/diagramStore';
import { isGroupNode, isShapeNode } from '../../lib/flowAdapter';
import type { EdgeDir, FlowDirection, NodeShape } from '../../core';

const SHAPES: { value: NodeShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'stadium', label: 'Stadium (pill)' },
  { value: 'circle', label: 'Circle' },
  { value: 'diamond', label: 'Diamond (decision)' },
];

const SUBGRAPH_DIRS: { value: FlowDirection | ''; label: string }[] = [
  { value: '', label: '(inherit from diagram)' },
  { value: 'TB', label: 'Top → Bottom' },
  { value: 'BT', label: 'Bottom → Top' },
  { value: 'LR', label: 'Left → Right' },
  { value: 'RL', label: 'Right → Left' },
];

const EDGE_DIRS: { value: EdgeDir; label: string }[] = [
  { value: 'forward', label: '→  Forward' },
  { value: 'back', label: '←  Back' },
  { value: 'both', label: '↔  Both' },
  { value: 'none', label: '—  No arrow' },
];

const fieldClass = 'mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm';

/** Context panel for the current selection: a shape node, a subgraph, or an edge. */
export function Inspector() {
  const selected = useDiagramStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId));
  const edge = useDiagramStore((s) => s.edges.find((e) => e.id === s.selectedEdgeId));
  // Derive (don't select) the group list: a selector returning a fresh array on
  // every call sends zustand v5 into an infinite render loop.
  const nodes = useDiagramStore((s) => s.nodes);
  const subgraphs = useMemo(() => nodes.filter(isGroupNode), [nodes]);
  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);
  const setNodeShape = useDiagramStore((s) => s.setNodeShape);
  const setNodeSubgraph = useDiagramStore((s) => s.setNodeSubgraph);
  const removeNode = useDiagramStore((s) => s.removeNode);
  const updateSubgraphLabel = useDiagramStore((s) => s.updateSubgraphLabel);
  const setSubgraphDirection = useDiagramStore((s) => s.setSubgraphDirection);
  const removeSubgraph = useDiagramStore((s) => s.removeSubgraph);
  const updateEdgeLabel = useDiagramStore((s) => s.updateEdgeLabel);
  const setEdgeDir = useDiagramStore((s) => s.setEdgeDir);
  const removeEdge = useDiagramStore((s) => s.removeEdge);

  const node = selected && isShapeNode(selected) ? selected : undefined;
  const group = selected && isGroupNode(selected) ? selected : undefined;

  return (
    <section className="border-b border-slate-200 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Inspector
      </h2>

      {node && (
        <div className="space-y-2">
          <label className="block text-sm text-slate-600">
            Label
            <input
              value={node.data.label}
              onChange={(e) => updateNodeLabel(node.id, e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-slate-600">
            Shape
            <select
              value={node.data.shape}
              onChange={(e) => setNodeShape(node.id, e.target.value as NodeShape)}
              className={fieldClass}
            >
              {SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            Subgraph
            <select
              value={node.parentId ?? ''}
              onChange={(e) => setNodeSubgraph(node.id, e.target.value || null)}
              className={fieldClass}
            >
              <option value="">(none)</option>
              {subgraphs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.data.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => removeNode(node.id)} className="text-sm text-red-600 hover:underline">
            Delete node
          </button>
        </div>
      )}

      {group && (
        <div className="space-y-2">
          <label className="block text-sm text-slate-600">
            Subgraph title
            <input
              value={group.data.label}
              onChange={(e) => updateSubgraphLabel(group.id, e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-slate-600">
            Direction
            <select
              value={group.data.direction ?? ''}
              onChange={(e) =>
                setSubgraphDirection(
                  group.id,
                  (e.target.value as FlowDirection) || undefined,
                )
              }
              className={fieldClass}
            >
              {SUBGRAPH_DIRS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-400">
            Assign nodes to this subgraph from each node's "Subgraph" dropdown.
          </p>
          <button
            onClick={() => removeSubgraph(group.id)}
            className="text-sm text-red-600 hover:underline"
          >
            Delete subgraph
          </button>
        </div>
      )}

      {edge && (
        <div className="space-y-2">
          <label className="block text-sm text-slate-600">
            Edge label
            <input
              value={typeof edge.label === 'string' ? edge.label : ''}
              onChange={(e) => updateEdgeLabel(edge.id, e.target.value)}
              placeholder="(none)"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm text-slate-600">
            Direction
            <select
              value={edge.data?.dir ?? 'forward'}
              onChange={(e) => setEdgeDir(edge.id, e.target.value as EdgeDir)}
              className={fieldClass}
            >
              {EDGE_DIRS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => removeEdge(edge.id)} className="text-sm text-red-600 hover:underline">
            Delete edge
          </button>
        </div>
      )}

      {!node && !group && !edge && (
        <p className="text-sm text-slate-400">
          Select a node, subgraph, or edge to edit it. Drag from the dot on a node's border to
          connect it to another.
        </p>
      )}
    </section>
  );
}
