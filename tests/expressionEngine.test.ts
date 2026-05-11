import { describe, expect, it } from 'vitest';
import {
  generateGraph,
  mapToFrequencies,
  validateExpression,
  validateGraphConfig,
} from '../src/services/expressionEngine';

describe('expressionEngine', () => {
  it('validates forbidden token', () => {
    expect(() => validateExpression('import("x")')).toThrow();
  });

  it('validates graph configuration range', () => {
    expect(() => validateGraphConfig({ sampleCount: 4, domainStart: -2, domainEnd: 2 })).toThrow();
  });

  it('generates graph points with custom config', () => {
    const points = generateGraph('sin(z)', { sampleCount: 64, domainStart: -2, domainEnd: 2 });
    expect(points.length).toBe(64);
    expect(points[0].x).toBe(-2);
    expect(points[63].x).toBe(2);
  });

  it('maps frequencies to audible range', () => {
    const frequencies = mapToFrequencies([{ x: 0, y: 1 }, { x: 1, y: 2 }]);
    expect(frequencies[0]).toBeGreaterThanOrEqual(220);
    expect(frequencies[1]).toBeLessThanOrEqual(880);
  });
});
