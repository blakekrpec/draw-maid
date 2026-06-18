import { describe, expect, it } from 'vitest';
import { parseFlowchart } from './flowchart';

describe('parseFlowchart', () => {
  it('parses nested subgraphs correctly', () => {
    const text = `flowchart TB
  n1["Top Level Node"]
  subgraph s1 ["Outer Subgraph"]
    n2["Node in Outer"]
    subgraph s2 ["Inner Subgraph"]
      n3["Node in Inner"]
      n4["Another Inner Node"]
    end
    n5["Another Outer Node"]
  end
  n1 --> n2
  n2 --> n3`;

    const diagram = parseFlowchart(text);

    // Check subgraphs
    expect(diagram.subgraphs).toHaveLength(2);
    const outer = diagram.subgraphs.find((s) => s.id === 's1');
    const inner = diagram.subgraphs.find((s) => s.id === 's2');
    
    expect(outer).toBeDefined();
    expect(outer?.label).toBe('Outer Subgraph');
    expect(outer?.parentId).toBeUndefined();

    expect(inner).toBeDefined();
    expect(inner?.label).toBe('Inner Subgraph');
    expect(inner?.parentId).toBe('s1'); // Inner should have outer as parent

    // Check nodes are assigned to correct subgraphs
    const n1 = diagram.nodes.find((n) => n.id === 'n1');
    const n2 = diagram.nodes.find((n) => n.id === 'n2');
    const n3 = diagram.nodes.find((n) => n.id === 'n3');
    const n4 = diagram.nodes.find((n) => n.id === 'n4');
    const n5 = diagram.nodes.find((n) => n.id === 'n5');

    expect(n1?.subgraphId).toBeUndefined(); // Top level
    expect(n2?.subgraphId).toBe('s1'); // In outer
    expect(n3?.subgraphId).toBe('s2'); // In inner
    expect(n4?.subgraphId).toBe('s2'); // In inner
    expect(n5?.subgraphId).toBe('s1'); // In outer

    // Check edges
    expect(diagram.edges).toHaveLength(2);
  });

  it('handles deeply nested subgraphs (3 levels)', () => {
    const text = `flowchart TB
  subgraph s1 ["Level 1"]
    subgraph s2 ["Level 2"]
      subgraph s3 ["Level 3"]
        n1["Deep Node"]
      end
    end
  end`;

    const diagram = parseFlowchart(text);

    expect(diagram.subgraphs).toHaveLength(3);
    
    const s1 = diagram.subgraphs.find((s) => s.id === 's1');
    const s2 = diagram.subgraphs.find((s) => s.id === 's2');
    const s3 = diagram.subgraphs.find((s) => s.id === 's3');

    expect(s1?.parentId).toBeUndefined();
    expect(s2?.parentId).toBe('s1');
    expect(s3?.parentId).toBe('s2');

    const n1 = diagram.nodes.find((n) => n.id === 'n1');
    expect(n1?.subgraphId).toBe('s3');
  });

  it('handles complex 3-layer nesting with multiple nodes at each level', () => {
    const text = `flowchart TB
  n0["Top Level Node"]
  subgraph s1 ["Outer Subgraph"]
    n1["Node in Outer"]
    subgraph s2 ["Middle Subgraph"]
      n2["Node in Middle"]
      subgraph s3 ["Inner Subgraph"]
        n3["Node in Inner"]
        n4["Another Inner Node"]
      end
      n5["Another Middle Node"]
    end
    n6["Another Outer Node"]
  end`;

    const diagram = parseFlowchart(text);

    // Verify subgraph structure
    expect(diagram.subgraphs).toHaveLength(3);
    const s1 = diagram.subgraphs.find((s) => s.id === 's1');
    const s2 = diagram.subgraphs.find((s) => s.id === 's2');
    const s3 = diagram.subgraphs.find((s) => s.id === 's3');

    expect(s1?.parentId).toBeUndefined();
    expect(s2?.parentId).toBe('s1');
    expect(s3?.parentId).toBe('s2');

    // Verify node assignments
    expect(diagram.nodes.find((n) => n.id === 'n0')?.subgraphId).toBeUndefined();
    expect(diagram.nodes.find((n) => n.id === 'n1')?.subgraphId).toBe('s1');
    expect(diagram.nodes.find((n) => n.id === 'n2')?.subgraphId).toBe('s2');
    expect(diagram.nodes.find((n) => n.id === 'n3')?.subgraphId).toBe('s3');
    expect(diagram.nodes.find((n) => n.id === 'n4')?.subgraphId).toBe('s3');
    expect(diagram.nodes.find((n) => n.id === 'n5')?.subgraphId).toBe('s2');
    expect(diagram.nodes.find((n) => n.id === 'n6')?.subgraphId).toBe('s1');
  });
});
