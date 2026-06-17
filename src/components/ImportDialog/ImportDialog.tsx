import { useRef, useState } from 'react';
import { parseFlowchart } from '../../core';
import { useDiagramStore } from '../../store/diagramStore';

const PLACEHOLDER = `flowchart LR
  A["Start"] --> B["Step 1"]
  B --> C{"Decision"}
  C -->|"yes"| D["Done"]
  C -->|"no"| B`;

/** Modal dialog: paste Mermaid text → rebuild the diagram model. */
export function ImportDialog() {
  const importOpen = useDiagramStore((s) => s.importOpen);
  const setImportOpen = useDiagramStore((s) => s.setImportOpen);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!importOpen) return null;

  const handleLoad = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Paste some Mermaid text first.');
      return;
    }
    try {
      const diagram = parseFlowchart(trimmed);
      loadDiagram(diagram);
      setText('');
      setError(null);
      setImportOpen(false);
    } catch (e) {
      setError(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleClose = () => {
    setText('');
    setError(null);
    setImportOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="flex w-[520px] flex-col gap-3 rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-800">Import Mermaid</h2>
        <p className="text-sm text-slate-500">
          Paste a <code className="rounded bg-slate-100 px-1">flowchart</code> block. The diagram
          will replace your current canvas (the old state is saved on the undo stack).
        </p>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className="h-52 w-full rounded border border-slate-300 bg-slate-50 p-2 font-mono text-xs leading-relaxed text-slate-800 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
}
