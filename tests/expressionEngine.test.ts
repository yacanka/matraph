import { describe, expect, it } from 'vitest';
import {
  generateGraph,
  mapToFrequencies,
  normalizeExpression,
  validateExpression,
  validateGraphConfig,
} from '../src/services/expressionEngine';

describe('expressionEngine', () => {
  it('validates forbidden token', () => {
    expect(() => validateExpression('import("x")')).toThrow();
  });

  it('normalizes calculator-like symbols', () => {
    const result = normalizeExpression('|sin(z)| + √(z^2) + π × z ÷ 2');
    expect(result).toBe('abs(sin(z)) + sqrt(z^2) + pi * z / 2');
  });

  it('rejects unbalanced absolute bars', () => {
    expect(() => normalizeExpression('|z + 1')).toThrow('Unbalanced absolute value bars.');
  });

  it('expands sigma notation to finite sum', () => {
    const result = normalizeExpression('∑(1,3,n^2)');
    expect(result).toBe('((1^2) + (2^2) + (3^2))');
  });

  it('does not replace letters inside function names while expanding sigma notation', () => {
    const result = normalizeExpression('∑(1,2,sin(n*z))');
    expect(result).toBe('((sin(1*z)) + (sin(2*z)))');
  });

  it('calculates finite sum in graph generation', () => {
    const points = generateGraph('∑(1,3,n*z)', { sampleCount: 16, domainStart: 2, domainEnd: 2.5 });
    expect(points[0].y).toBe(12);
  });

  it('validates graph configuration range', () => {
    expect(() => validateGraphConfig({ sampleCount: 4, domainStart: -2, domainEnd: 2 })).toThrow();
  });


  it('preserves negative values for real-valued expressions', () => {
    const points = generateGraph('sin(z)', { sampleCount: 17, domainStart: -1.5707963, domainEnd: 1.5707963 });
    expect(points[0].y).toBeLessThan(0);
    expect(points[16].y).toBeGreaterThan(0);
  });

  it('generates graph points with custom config', () => {
    const points = generateGraph('sin(z)', { sampleCount: 64, domainStart: -2, domainEnd: 2 });
    expect(points.length).toBe(64);
    expect(points[0].x).toBe(-2);
    expect(points[63].x).toBe(2);
  });

  it('marks non-finite graph values as gaps', () => {
    const points = generateGraph('1 / z', { sampleCount: 17, domainStart: -1, domainEnd: 1 });
    expect(points[8].y).toBeNull();
  });

  it('keeps numeric mathjs results finite', () => {
    const points = generateGraph('2', { sampleCount: 16, domainStart: 0, domainEnd: 1 });
    expect(points.every((point) => point.y === 2)).toBe(true);
  });

  it('maps frequencies to audible range', () => {
    const frequencies = mapToFrequencies([{ x: 0, y: null }, { x: 1, y: 2 }]);
    expect(frequencies[0]).toBeGreaterThanOrEqual(220);
    expect(frequencies[0]).toBeLessThanOrEqual(880);
  });
});
