import type { Diagram } from '../model/types';
import { serializeFlowchart } from './flowchart';

/** Turn a diagram model into Mermaid source text. */
export function serialize(diagram: Diagram): string {
  if (diagram.type === 'flowchart') return serializeFlowchart(diagram);
  return '';
}
