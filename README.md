# draw-maid

A free, open-source **visual editor for [Mermaid](https://mermaid.js.org/) diagrams**.
Drag boxes around, connect them, and get clean Mermaid source out — no typing the
markdown by hand.

> Status: early scaffold. Visual flowchart editing → Mermaid text works today.

## Tech stack

| Concern            | Tool                                   |
| ------------------ | -------------------------------------- |
| Language           | TypeScript                             |
| Build / dev server | [Vite](https://vite.dev)               |
| UI framework       | [React](https://react.dev)             |
| Node editor        | [React Flow](https://reactflow.dev) (`@xyflow/react`) |
| Diagram rendering  | [`mermaid`](https://mermaid.js.org)    |
| State              | [Zustand](https://zustand.docs.pmnd.rs) |
| Styling            | [Tailwind CSS](https://tailwindcss.com) v4 |
| Tests              | [Vitest](https://vitest.dev)           |

It's a **100% client-side static site** — no backend, no database. That means it
can be hosted for free on GitHub Pages, Cloudflare Pages, Netlify, or Vercel.

## Getting started

```bash
npm install      # install dependencies (first time only)
npm run dev      # start the dev server → http://localhost:5173
```

Other scripts:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm test         # run unit tests once
npm run test:watch
npm run lint     # ESLint
npm run format   # Prettier (writes changes)
```

## Architecture

One editing state, projected into Mermaid:

```
   store (React Flow nodes/edges)  ← the live editing state
                 │
                 │  flowToDiagram()  (src/lib/flowAdapter.ts)
                 ▼
        Diagram model (src/core)  → Mermaid text → rendered SVG (mermaid.js)
```

The canvas is React Flow, and the store holds React Flow's own nodes/edges as
the live editing state — letting the library manage node measurement, dragging,
and selection (the thing that bit us early on: rebuilding nodes by hand made
them invisible). For everything else, the data is converted into the pure
`Diagram` model, which is what the serializer (and, later, persistence/import)
operates on.

The golden rule that keeps this maintainable:

> **`src/core/` is pure TypeScript and never imports React, React Flow, the
> store, or any component.** Dependencies point inward only:
> components → store → core.

All the "interesting" logic (the model→Mermaid serializer, and eventually a
Mermaid→model parser) lives in `core/`, where it can be unit-tested without a
browser.

### Layout

```
src/
├─ core/            pure, framework-free logic (unit-tested)
│  ├─ model/        Diagram/Node/Edge types + id helpers
│  └─ serialize/    model → Mermaid text
├─ store/           Zustand store — live React Flow state; converts to the model
├─ lib/             UI-side helpers (React Flow ↔ core model adapter)
├─ components/      "dumb" React components (rendering only)
│  ├─ Canvas/       React Flow editing surface
│  ├─ Toolbar/      add node, direction, clear
│  ├─ Inspector/    edit the selected node/edge
│  ├─ CodePanel/    live generated Mermaid + copy
│  └─ Preview/      renders the Mermaid to SVG
└─ App.tsx          layout shell
```

## TODO
- [x] Nested subgraph support
- [ ] Save / load diagrams (localStorage + download/upload `.json` and `.mmd`).
- [ ] More diagram types (sequence, class, state).
- [x] **Import**: parse existing Mermaid text → model
- [x] Undo / redo.
- [ ] Export the preview as SVG / PNG.
