import { describe, expect, it } from 'vitest';
import { expressionGraphEngine } from '../src/services/graphEngine';

describe('graphEngine', () => {
  it('renders through the expression graph engine contract', () => {
    const points = expressionGraphEngine.render({
      expression: '[sin(t), cos(t)]',
      config: { sampleCount: 17, domainStart: 0, domainEnd: Math.PI },
    });

    expect(points).toHaveLength(17);
    expect(points[8].x).toBeCloseTo(1);
    expect(points[8].y).toBeCloseTo(0);
  });
});
