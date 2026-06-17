import { useCallback, useMemo } from 'react';
import {
  Background,
  ConnectionMode,
  ControlButton,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  SelectionMode,
  type EdgeMarker,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import { useDiagramStore } from '../../store/diagramStore';
import type { FlowEdge, FlowNode } from '../../lib/flowAdapter';
import { ShapeNode } from './ShapeNode';
import { GroupNode } from './GroupNode';
import { RightDragSelect } from './RightDragSelect';
import { HandIcon, MarqueeIcon } from './toolIcons';

// Stable references — recreating these on every render makes React Flow warn
// and remount nodes/edges.
const nodeTypes = { shape: ShapeNode, group: GroupNode };
const arrow: EdgeMarker = { type: MarkerType.ArrowClosed, width: 18, height: 18 };

/**
 * The visual editing surface. React Flow owns the interaction (drag, connect,
 * zoom) and the node/edge state lives in the store. Edges are decorated here
 * with arrowhead markers derived from each edge's direction.
 */
export function Canvas() {
  const nodes = useDiagramStore((s) => s.nodes);
  const rawEdges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const onReconnect = useDiagramStore((s) => s.onReconnect);
  const beginInteraction = useDiagramStore((s) => s.beginInteraction);
  const selectNode = useDiagramStore((s) => s.selectNode);
  const selectEdge = useDiagramStore((s) => s.selectEdge);
  const mode = useDiagramStore((s) => s.mode);
  const setMode = useDiagramStore((s) => s.setMode);
  const toggleMode = useDiagramStore((s) => s.toggleMode);

  const edges = useMemo(
    () =>
      rawEdges.map((e) => {
        const dir = e.data?.dir ?? 'forward';
        return {
          ...e,
          markerStart: dir === 'back' || dir === 'both' ? arrow : undefined,
          markerEnd: dir === 'forward' || dir === 'both' ? arrow : undefined,
        };
      }),
    [rawEdges],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      // The Inspector only makes sense for a single selection; with a multi-select
      // (box/marquee) we clear it so the panel doesn't show one arbitrary item.
      const single = selNodes.length + selEdges.length === 1;
      selectNode(single && selNodes.length === 1 ? selNodes[0].id : null);
      selectEdge(single && selEdges.length === 1 ? selEdges[0].id : null);
    },
    [selectNode, selectEdge],
  );

  // Deleting a subgraph should keep its member nodes (the store un-groups them),
  // not cascade-delete them the way React Flow does by default.
  const onBeforeDelete = useCallback(
    async ({ nodes: delNodes, edges: delEdges }: { nodes: FlowNode[]; edges: FlowEdge[] }) => {
      const groupIds = new Set(delNodes.filter((n) => n.type === 'group').map((n) => n.id));
      if (groupIds.size === 0) return true;
      const keptNodes = delNodes.filter((n) => !(n.parentId && groupIds.has(n.parentId)));
      const deletedIds = new Set(keptNodes.map((n) => n.id));
      const keptEdges = delEdges.filter(
        (e) => deletedIds.has(e.source) || deletedIds.has(e.target),
      );
      return { nodes: keptNodes, edges: keptEdges };
    },
    [],
  );

  return (
    <ReactFlow
      className="h-full w-full"
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onReconnect={onReconnect}
      onNodeDragStart={beginInteraction}
      onSelectionChange={onSelectionChange}
      onBeforeDelete={onBeforeDelete}
      // After a marquee selection finishes, drop back to pan so the user can
      // immediately move/pan — "select is a thing you step into, then leave".
      onSelectionEnd={() => setMode('pan')}
      deleteKeyCode={['Backspace', 'Delete']}
      // Pan mode: left-drag pans (Shift+drag still box-selects).
      // Select mode: left-drag draws a selection box; middle/right still pan.
      panOnDrag={mode === 'pan' ? true : [1, 2]}
      selectionOnDrag={mode === 'select'}
      selectionMode={SelectionMode.Partial}
      fitView
    >
      <RightDragSelect />
      <Background />
      <Controls>
        <ControlButton
          onClick={toggleMode}
          title={
            mode === 'pan'
              ? 'Pan mode — click (or press V) to switch to Select'
              : 'Select mode — click (or press V) to switch to Pan'
          }
        >
          {mode === 'pan' ? <HandIcon /> : <MarqueeIcon />}
        </ControlButton>
      </Controls>
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
