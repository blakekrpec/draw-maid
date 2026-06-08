/**
 * Id generation. Ids are kept short and Mermaid-safe (e.g. "n1", "e3") so they
 * can be emitted directly into Mermaid source without escaping.
 */

function nextNumberedId(prefix: string, existing: { id: string }[]): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const item of existing) {
    const match = pattern.exec(item.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

export function nextNodeId(existing: { id: string }[]): string {
  return nextNumberedId('n', existing);
}

export function nextEdgeId(existing: { id: string }[]): string {
  return nextNumberedId('e', existing);
}

export function nextSubgraphId(existing: { id: string }[]): string {
  return nextNumberedId('s', existing);
}
