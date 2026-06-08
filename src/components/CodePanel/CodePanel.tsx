import { useState } from 'react';
import { useDiagramStore } from '../../store/diagramStore';

/** Shows the live Mermaid source generated from the diagram, with copy-to-clipboard. */
export function CodePanel() {
  const code = useDiagramStore((s) => s.code());
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="flex min-h-0 flex-col border-t border-slate-200">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mermaid</h2>
        <button onClick={copy} className="text-xs text-slate-500 hover:text-slate-800">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-auto bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
        {code}
      </pre>
    </section>
  );
}
