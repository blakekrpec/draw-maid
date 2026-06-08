import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import type { GroupFlowNode } from '../../lib/flowAdapter';

// Handles on each side so edges can connect to/from the subgraph itself
// (Mermaid allows `n1 --> s1`). ConnectionMode.Loose lets any side be source
// or target.
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

/**
 * The visual container for a Mermaid subgraph. Child nodes (those with this
 * node's id as their `parentId`) render inside it and move with it. Resizable
 * while selected; deleting it un-groups its members (see the store).
 */
export function GroupNode({ data, selected }: NodeProps<GroupFlowNode>) {
  return (
    <>
      <NodeResizer minWidth={180} minHeight={140} isVisible={selected} />
      <div
        className={`h-full w-full rounded-md border-2 border-dashed bg-slate-500/5 ${
          selected ? 'border-blue-500' : 'border-slate-400'
        }`}
      >
        <span className="absolute left-2 top-1 text-xs font-semibold text-slate-500">
          {data.label}
        </span>
      </div>
      {SIDES.map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={side}
          className="!h-2 !w-2 !border !border-white !bg-slate-400"
        />
      ))}
    </>
  );
}
