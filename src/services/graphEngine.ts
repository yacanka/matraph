import { generateGraph } from './expressionEngine';
import type { GraphConfig, GraphPoint } from '../types/graph';

export interface GraphEngineInput {
  expression: string;
  config: Partial<GraphConfig>;
}

export interface GraphEngine {
  /** Render expression input into graph points for plot and playback consumers. */
  render(input: GraphEngineInput): GraphPoint[];
}

export const expressionGraphEngine: GraphEngine = {
  render(input: GraphEngineInput): GraphPoint[] {
    return generateGraph(input.expression, input.config);
  },
};
