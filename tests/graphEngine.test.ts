import { describe, expect, it } from 'vitest';
import { expressionGraphEngine } from '../src/services/graphEngine';

describe('graphEngine', () => {
  it('renders through the expression graph engine contract', () => {
    const render = expressionGraphEngine.render({
      expression: '[sin(t), cos(t)]',
      config: { sampleCount: 17, domainStart: 0, domainEnd: Math.PI },
    });

    expect(render.series).toHaveLength(1);
    expect(render.primarySeries.kind).toBe('parametric');
    expect(render.points[8].x).toBeCloseTo(1);
    expect(render.points[8].y).toBeCloseTo(0);
  });
});
