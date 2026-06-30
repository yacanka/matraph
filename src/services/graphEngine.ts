import { generateGraphRender } from './expressionEngine';
import type { GraphConfig, GraphRender } from '../types/graph';

export interface GraphEngineInput {
  expression: string;
  config: Partial<GraphConfig>;
}

export interface GraphEngine {
  /** Render expression input into graph series for plot and playback consumers. */
  render(input: GraphEngineInput): GraphRender;
}

export const expressionGraphEngine: GraphEngine = {
  render(input: GraphEngineInput): GraphRender {
    return generateGraphRender(input.expression, input.config);
  },
};
