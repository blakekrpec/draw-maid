import { describe, expect, it } from 'vitest';
import { diagramToFlow } from './flowAdapter';
import type { Diagram } from '../core';

describe('diagramToFlow nested subgraph sizing', () => {
  it('sizes nested subgraphs to fit their children', () => {
    const diagram: Diagram = {
      type: 'flowchart',
      direction: 'TB',
      subgraphs: [
        { id: 's1', label: 'Outer' },
        { id: 's2', label: 'Inner', parentId: 's1' },
      ],
      nodes: [
        { id: 'n1', label: 'In Inner', shape: 'rectangle', position: { x: 20, y: 40 }, subgraphId: 's2' },
      ],
      edges: [],
    };

    const { nodes } = diagramToFlow(diagram);
    
    const outerSubgraph = nodes.find((n) => n.id === 's1');
    const innerSubgraph = nodes.find((n) => n.id === 's2');

    expect(outerSubgraph).toBeDefined();
    expect(innerSubgraph).toBeDefined();

    // Inner subgraph should be sized to fit its child node
    expect(innerSubgraph!.style?.width).toBeGreaterThan(150); // NODE_W(130) + padding
    expect(innerSubgraph!.style?.height).toBeGreaterThan(100); // NODE_H(44) + padding

    // Outer subgraph should be sized to fit the inner subgraph
    expect(outerSubgraph!.style?.width).toBeGreaterThan(innerSubgraph!.style!.width as number);
    expect(outerSubgraph!.style?.height).toBeGreaterThan(innerSubgraph!.style!.height as number);
  });

  it('handles 3-level nested subgraphs with proper sizing', () => {
    const diagram: Diagram = {
      type: 'flowchart',
      direction: 'TB',
      subgraphs: [
        { id: 's1', label: 'Outer' },
        { id: 's2', label: 'Middle', parentId: 's1' },
        { id: 's3', label: 'Inner', parentId: 's2' },
      ],
      nodes: [
        { id: 'n1', label: 'Deep', shape: 'rectangle', position: { x: 20, y: 40 }, subgraphId: 's3' },
      ],
      edges: [],
    };

    const { nodes } = diagramToFlow(diagram);
    
    const s1 = nodes.find((n) => n.id === 's1');
    const s2 = nodes.find((n) => n.id === 's2');
    const s3 = nodes.find((n) => n.id === 's3');

    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
    expect(s3).toBeDefined();

    // Each level should be progressively larger
    const w1 = s1!.style!.width as number;
    const w2 = s2!.style!.width as number;
    const w3 = s3!.style!.width as number;
    
    expect(w1).toBeGreaterThan(w2);
    expect(w2).toBeGreaterThan(w3);
  });
});
