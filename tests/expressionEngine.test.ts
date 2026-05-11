import { describe, expect, it } from 'vitest';
import { generateGraph, mapToFrequencies, validateExpression } from '../src/services/expressionEngine';

describe('expressionEngine', () => {
  it('validates forbidden token', () => {
    expect(() => validateExpression('import("x")')).toThrow();
  });

  it('generates graph points', () => {
    const points = generateGraph('sin(z)');
    expect(points.length).toBe(256);
  });

  it('maps frequencies to audible range', () => {
    const frequencies = mapToFrequencies([{ x: 0, y: 1 }, { x: 1, y: 2 }]);
    expect(frequencies[0]).toBeGreaterThanOrEqual(220);
    expect(frequencies[1]).toBeLessThanOrEqual(880);
  });
});
