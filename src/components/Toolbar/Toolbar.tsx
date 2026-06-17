import { useDiagramStore } from '../../store/diagramStore';
import type { FlowDirection } from '../../core';

const DIRECTIONS: { value: FlowDirection; label: string }[] = [
  { value: 'TB', label: 'Top → Bottom' },
  { value: 'BT', label: 'Bottom → Top' },
  { value: 'LR', label: 'Left → Right' },
  { value: 'RL', label: 'Right → Left' },
];

export function Toolbar() {
  const addNode = useDiagramStore((s) => s.addNode);
  const addSubgraph = useDiagramStore((s) => s.addSubgraph);
  const direction = useDiagramStore((s) => s.direction);
  const setDirection = useDiagramStore((s) => s.setDirection);
  const clear = useDiagramStore((s) => s.clear);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const canUndo = useDiagramStore((s) => s.past.length > 0);
  const canRedo = useDiagramStore((s) => s.future.length > 0);
  const setHelpOpen = useDiagramStore((s) => s.setHelpOpen);
  const setImportOpen = useDiagramStore((s) => s.setImportOpen);

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <span className="font-semibold text-slate-800">draw-maid</span>
      <span className="text-xs text-slate-400">visual Mermaid editor</span>

      <div className="mx-2 h-5 w-px bg-slate-200" />

      <button
        onClick={addNode}
        className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        + Add node
      </button>

      <button
        onClick={addSubgraph}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        + Subgraph
      </button>

      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        Direction
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as FlowDirection)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          {DIRECTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mx-2 h-5 w-px bg-slate-200" />

      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl/Cmd+Z)"
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↶ Undo
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl/Cmd+Shift+Z)"
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↷ Redo
      </button>

      <div className="flex-1" />

      <button
        onClick={() => setImportOpen(true)}
        title="Import Mermaid text"
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        Import
      </button>

      <button
        onClick={() => setHelpOpen(true)}
        title="Help & keyboard shortcuts (?)"
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        ? Help
      </button>

      <button
        onClick={() => {
          if (confirm('Clear the whole diagram?')) clear();
        }}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        Clear
      </button>
    </header>
  );
}
