import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useDiagramStore } from '../../store/diagramStore';
import type { FlowNode } from '../../lib/flowAdapter';

// Don't start a marquee when the press lands on an actual element.
const IGNORE =
  '.react-flow__node, .react-flow__handle, .react-flow__controls, .react-flow__minimap, .react-flow__panel';

/**
 * Right-drag box selection. React Flow's built-in selection is hard-wired to the
 * left button, so we implement a marquee on the right button ourselves and only
 * in Pan mode (in Select mode the right button still pans). Rendered inside
 * <ReactFlow> so it has the flow's coordinate helpers.
 */
export function RightDragSelect() {
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow<FlowNode>();
  const setSelectedNodes = useDiagramStore((s) => s.setSelectedNodes);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 2 || useDiagramStore.getState().mode !== 'pan') return;
      const t = e.target as HTMLElement;
      if (!t.closest('.react-flow__pane') || t.closest(IGNORE)) return;
      start.current = { x: e.clientX, y: e.clientY };
      setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    };

    const onMove = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      setRect({
        x: Math.min(s.x, e.clientX),
        y: Math.min(s.y, e.clientY),
        w: Math.abs(e.clientX - s.x),
        h: Math.abs(e.clientY - s.y),
      });
    };

    const onUp = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      start.current = null;
      setRect(null);
      if (Math.abs(e.clientX - s.x) < 3 && Math.abs(e.clientY - s.y) < 3) return;
      const a = screenToFlowPosition({ x: Math.min(s.x, e.clientX), y: Math.min(s.y, e.clientY) });
      const b = screenToFlowPosition({ x: Math.max(s.x, e.clientX), y: Math.max(s.y, e.clientY) });
      const hits = getIntersectingNodes(
        { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y },
        true,
      );
      setSelectedNodes(hits.map((n) => n.id));
    };

    // Suppress the browser context menu over the canvas so right-drag is usable.
    const onContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.react-flow__pane')) e.preventDefault();
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, [screenToFlowPosition, getIntersectingNodes, setSelectedNodes]);

  if (!rect) return null;
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-sm border border-blue-500 bg-blue-500/10"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  );
}
