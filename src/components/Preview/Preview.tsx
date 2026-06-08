import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useDiagramStore } from '../../store/diagramStore';

// Initialize Mermaid once. `startOnLoad: false` because we render on demand.
mermaid.initialize({ startOnLoad: false, theme: 'default' });

let renderId = 0;

/** Renders the generated Mermaid source to an SVG, the way it will actually look. */
export function Preview() {
  const code = useDiagramStore((s) => s.code());
  const isEmpty = useDiagramStore((s) => s.nodes.length === 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const container = containerRef.current;
      if (!container) return;

      // Mermaid errors on a flowchart with no nodes; show a placeholder instead.
      if (isEmpty) {
        container.innerHTML = '';
        setError(null);
        return;
      }

      try {
        const { svg } = await mermaid.render(`drawmaid-preview-${renderId++}`, code);
        if (!cancelled) {
          container.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code, isEmpty]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Preview
      </h2>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        {isEmpty && (
          <p className="text-sm text-slate-400">Add a node to see the rendered diagram.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={containerRef} className="[&_svg]:h-auto [&_svg]:max-w-full" />
      </div>
    </section>
  );
}
