import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas/Canvas';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Inspector } from './components/Inspector/Inspector';
import { CodePanel } from './components/CodePanel/CodePanel';
import { Preview } from './components/Preview/Preview';
import { HelpDialog } from './components/Help/HelpDialog';
import { useDiagramStore } from './store/diagramStore';

const isTypingTarget = (el: EventTarget | null) => {
  const tag = (el as HTMLElement | null)?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * App shell / layout. Three regions:
 *   - Toolbar across the top
 *   - the React Flow Canvas (fills the remaining width)
 *   - a right sidebar: Inspector, live Preview, and generated Mermaid code
 */
export default function App() {
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const toggleMode = useDiagramStore((s) => s.toggleMode);
  const setMode = useDiagramStore((s) => s.setMode);
  const setHelpOpen = useDiagramStore((s) => s.setHelpOpen);

  // Global keyboard shortcuts (ignored while typing in a form field).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        redo();
      } else if (!mod && key === 'v') {
        e.preventDefault();
        toggleMode();
      } else if (!mod && key === '?') {
        e.preventDefault();
        setHelpOpen(true);
      } else if (key === 'escape') {
        setMode('pan');
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, toggleMode, setMode, setHelpOpen]);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1">
            <Canvas />
          </main>
          <aside className="flex w-[360px] flex-col border-l border-slate-200 bg-white">
            <Inspector />
            <Preview />
            <CodePanel />
          </aside>
        </div>
      </div>
      <HelpDialog />
    </ReactFlowProvider>
  );
}
