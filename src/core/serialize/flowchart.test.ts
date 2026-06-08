import { describe, expect, it } from 'vitest';
import type { Diagram, DiagramEdge, DiagramNode } from '../model/types';
import { serialize } from './index';

function diagram(partial: Partial<Diagram> = {}): Diagram {
  return { type: 'flowchart', direction: 'TB', nodes: [], edges: [], subgraphs: [], ...partial };
}

function node(p: Partial<DiagramNode> & { id: string }): DiagramNode {
  return { label: '', shape: 'rectangle', position: { x: 0, y: 0 }, ...p };
}

function edge(p: Partial<DiagramEdge> & { id: string; source: string; target: string }): DiagramEdge {
  return { dir: 'forward', ...p };
}

describe('serialize flowchart', () => {
  it('emits the direction header for an empty diagram', () => {
    expect(serialize(diagram())).toBe('flowchart TB');
  });

  it('declares nodes with shape-specific delimiters', () => {
    const d = diagram({
      nodes: [
        node({ id: 'n1', label: 'Start', shape: 'stadium' }),
        node({ id: 'n2', label: 'Decide', shape: 'diamond' }),
      ],
    });
    expect(serialize(d)).toBe(['flowchart TB', '  n1(["Start"])', '  n2{"Decide"}'].join('\n'));
  });

  it('emits edges, with and without labels', () => {
    const d = diagram({
      nodes: [node({ id: 'n1', label: 'A' }), node({ id: 'n2', label: 'B' })],
      edges: [
        edge({ id: 'e1', source: 'n1', target: 'n2' }),
        edge({ id: 'e2', source: 'n1', target: 'n2', label: 'yes' }),
      ],
    });
    expect(serialize(d)).toBe(
      ['flowchart TB', '  n1["A"]', '  n2["B"]', '  n1 --> n2', '  n1 -->|"yes"| n2'].join('\n'),
    );
  });

  it('emits each arrow direction variant', () => {
    const nodes = [node({ id: 'n1', label: 'A' }), node({ id: 'n2', label: 'B' })];
    const line = (dir: DiagramEdge['dir']) =>
      serialize(diagram({ nodes, edges: [edge({ id: 'e1', source: 'n1', target: 'n2', dir })] }))
        .split('\n')
        .at(-1)
        ?.trim();
    expect(line('forward')).toBe('n1 --> n2');
    expect(line('back')).toBe('n2 --> n1');
    expect(line('both')).toBe('n1 <--> n2');
    expect(line('none')).toBe('n1 --- n2');
  });

  it('keeps the label when changing direction', () => {
    const nodes = [node({ id: 'n1' }), node({ id: 'n2' })];
    const d = diagram({
      nodes,
      edges: [edge({ id: 'e1', source: 'n1', target: 'n2', dir: 'both', label: 'maybe' })],
    });
    expect(serialize(d)).toContain('n1 <-->|"maybe"| n2');
  });

  it('escapes double quotes in labels', () => {
    const d = diagram({ nodes: [node({ id: 'n1', label: 'say "hi"' })] });
    expect(serialize(d)).toContain('n1["say #quot;hi#quot;"]');
  });

  it('honours the chosen direction', () => {
    expect(serialize(diagram({ direction: 'LR' }))).toBe('flowchart LR');
  });

  it('wraps member nodes in a subgraph block and keeps edges at the top level', () => {
    const d = diagram({
      subgraphs: [{ id: 's1', label: 'Auth' }],
      nodes: [
        node({ id: 'n1', label: 'A', subgraphId: 's1' }),
        node({ id: 'n2', label: 'B', subgraphId: 's1' }),
        node({ id: 'n3', label: 'C' }),
      ],
      edges: [edge({ id: 'e1', source: 'n1', target: 'n2' })],
    });
    expect(serialize(d)).toBe(
      [
        'flowchart TB',
        '  n3["C"]',
        '  subgraph s1 ["Auth"]',
        '    n1["A"]',
        '    n2["B"]',
        '  end',
        '  n1 --> n2',
      ].join('\n'),
    );
  });

  it('nests subgraphs by parentId', () => {
    const d = diagram({
      subgraphs: [
        { id: 's1', label: 'Outer' },
        { id: 's2', label: 'Inner', parentId: 's1' },
      ],
      nodes: [node({ id: 'n1', label: 'A', subgraphId: 's2' })],
    });
    expect(serialize(d)).toBe(
      [
        'flowchart TB',
        '  subgraph s1 ["Outer"]',
        '    subgraph s2 ["Inner"]',
        '      n1["A"]',
        '    end',
        '  end',
      ].join('\n'),
    );
  });

  it('treats a node whose subgraph no longer exists as top-level', () => {
    const d = diagram({ nodes: [node({ id: 'n1', label: 'A', subgraphId: 'gone' })] });
    expect(serialize(d)).toBe(['flowchart TB', '  n1["A"]'].join('\n'));
  });
});
