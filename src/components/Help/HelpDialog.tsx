import { useDiagramStore } from '../../store/diagramStore';

interface Row {
  action: string;
  how: string;
}

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Building',
    rows: [
      { action: 'Add a node', how: 'Toolbar → + Add node' },
      { action: 'Add a subgraph', how: 'Toolbar → + Subgraph' },
      { action: 'Connect / edge', how: "Drag from a dot on a node's (or subgraph's) border to another" },
      { action: 'Edit a node / edge / subgraph', how: 'Select a single item → edit it in the Inspector' },
    ],
  },
  {
    title: 'Moving around',
    rows: [
      { action: 'Pan', how: 'In Pan mode, drag the empty canvas — or drag with the middle/right mouse button' },
      { action: 'Zoom', how: 'Scroll, or the +/− buttons (bottom-left)' },
      { action: 'Switch Pan / Select', how: 'The hand/box button (bottom-left) or press V' },
    ],
  },
  {
    title: 'Selecting & moving',
    rows: [
      { action: 'Box-select many', how: 'Right-drag a box anytime — or enter Select mode (V) and left-drag, or Shift+drag in Pan mode' },
      { action: 'Add to selection', how: 'Shift + click an item' },
      { action: 'Move a selection', how: 'Drag any selected node; the whole selection moves together' },
    ],
  },
  {
    title: 'Keyboard',
    rows: [
      { action: 'Undo / Redo', how: 'Ctrl/⌘ + Z  /  Ctrl/⌘ + Shift + Z' },
      { action: 'Delete selection', how: 'Backspace or Delete (deleting a subgraph keeps its members)' },
      { action: 'Pan / Select toggle', how: 'V' },
      { action: 'Close this / leave Select', how: 'Esc' },
    ],
  },
];

/** Modal explaining the controls and keyboard shortcuts. */
export function HelpDialog() {
  const open = useDiagramStore((s) => s.helpOpen);
  const setHelpOpen = useDiagramStore((s) => s.setHelpOpen);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="max-h-[82vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">How to use draw-maid</h2>
          <button
            onClick={() => setHelpOpen(false)}
            className="rounded px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close help"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.title}
              </h3>
              <dl className="space-y-1">
                {section.rows.map((row) => (
                  <div key={row.action} className="flex gap-3 text-sm">
                    <dt className="w-44 shrink-0 font-medium text-slate-700">{row.action}</dt>
                    <dd className="text-slate-500">{row.how}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
          The diagram is generated as Mermaid on the right — copy it anywhere Mermaid is supported.
        </p>
      </div>
    </div>
  );
}
