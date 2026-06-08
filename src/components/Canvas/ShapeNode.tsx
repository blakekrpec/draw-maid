import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ShapeFlowNode } from '../../lib/flowAdapter';

// A connection point on each side. ConnectionMode.Loose (set on <ReactFlow>)
// lets any of these act as both a source and a target, so you can draw edges
// from/to whichever side is convenient.
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

/**
 * A node that actually looks like its Mermaid shape (rectangle, rounded,
 * stadium, circle, diamond) so the canvas reads closer to the rendered preview.
 */
export function ShapeNode({ data, selected }: NodeProps<ShapeFlowNode>) {
  const border = selected ? 'border-blue-500' : 'border-slate-700';
  const box = `flex items-center justify-center border-2 bg-white px-4 py-2 text-center text-sm text-slate-800 ${border}`;

  let shape;
  switch (data.shape) {
    case 'rectangle':
      shape = <div className={`${box} min-w-[80px]`}>{data.label}</div>;
      break;
    case 'rounded':
      shape = <div className={`${box} min-w-[80px] rounded-lg`}>{data.label}</div>;
      break;
    case 'stadium':
      shape = <div className={`${box} min-w-[80px] rounded-full px-5`}>{data.label}</div>;
      break;
    case 'circle':
      shape = (
        <div className={`${box} aspect-square min-w-[84px] max-w-[160px] break-words rounded-full`}>
          {data.label}
        </div>
      );
      break;
    case 'diamond':
      shape = (
        <div className="relative grid h-28 w-28 place-items-center">
          <div
            className={`absolute border-2 bg-white ${border}`}
            style={{
              width: 76,
              height: 76,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%) rotate(45deg)',
            }}
          />
          <span className="relative z-10 max-w-[88px] break-words px-1 text-center text-xs text-slate-800">
            {data.label}
          </span>
        </div>
      );
      break;
  }

  return (
    <div className="relative">
      {shape}
      {SIDES.map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={side}
          className="!h-2 !w-2 !border !border-white !bg-slate-500"
        />
      ))}
    </div>
  );
}
