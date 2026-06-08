import { describe, expect, it } from 'vitest';
import { nextEdgeId, nextNodeId } from './ids';

describe('id generation', () => {
  it('starts at 1 for an empty list', () => {
    expect(nextNodeId([])).toBe('n1');
    expect(nextEdgeId([])).toBe('e1');
  });

  it('increments past the highest existing numbered id', () => {
    expect(nextNodeId([{ id: 'n1' }, { id: 'n5' }, { id: 'n2' }])).toBe('n6');
  });

  it('ignores ids that do not match the prefix pattern', () => {
    expect(nextNodeId([{ id: 'custom' }, { id: 'n3' }])).toBe('n4');
  });
});
