import { describe, expect, it } from 'vitest';
import {
  generateGraph,
  generateParametricGraph,
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


  it('normalizes trigonometric power shorthand', () => {
    expect(normalizeExpression('sin^2(z) + cos^2(z)')).toBe('(sin(z))^2 + (cos(z))^2');
    expect(normalizeExpression('sin^2 + cos^2')).toBe('(sin(z))^2 + (cos(z))^2');
  });

  it('evaluates trig identity to constant one', () => {
    const points = generateGraph('sin^2 + cos^2', { sampleCount: 16, domainStart: -5, domainEnd: 5 });
    expect(points.every((point) => Math.abs(point.y - 1) < 1e-8)).toBe(true);
  });

  it('rejects unbalanced absolute bars', () => {
    expect(() => normalizeExpression('|z + 1')).toThrow('Unbalanced absolute value bars.');
  });

  it('expands sigma notation to finite sum', () => {
    const result = normalizeExpression('∑(1,3,n^2)');
    expect(result).toBe('((1^2) + (2^2) + (3^2))');
  });


  it('supports nested summation expressions safely', () => {
    const result = normalizeExpression('sumN(1,2,sumN(1,2,n*z))');
    expect(result).toBe('((((1*z) + (2*z))) + (((1*z) + (2*z))))');
  });

  it('does not replace characters inside longer identifiers', () => {
    const result = normalizeExpression('sumN(1,2,sin(n)+tan(z))');
    expect(result).toBe('((sin(1)+tan(z)) + (sin(2)+tan(z)))');
  });

  it('calculates finite sum in graph generation', () => {
    const points = generateGraph('∑(1,3,n*z)', { sampleCount: 16, domainStart: 2, domainEnd: 2.5 });
    expect(points[0].y).toBe(12);
  });

  it('validates graph configuration range', () => {
    expect(() => validateGraphConfig({ sampleCount: 4, domainStart: -2, domainEnd: 2 })).toThrow();
  });



  it('returns NaN for non-real outputs instead of magnitude distortion', () => {
    const points = generateGraph('sqrt(z)', { sampleCount: 16, domainStart: -4, domainEnd: 4 });
    expect(Number.isNaN(points[0].y)).toBe(true);
    expect(points[15].y).toBeGreaterThanOrEqual(0);
  });

  it('preserves negative values for real-valued expressions', () => {
    const points = generateGraph('sin(z)', { sampleCount: 16, domainStart: -1.5707963, domainEnd: 1.5707963 });
    expect(points[0].y).toBeLessThan(0);
    expect(points[15].y).toBeGreaterThan(0);
  });

  it('generates graph points with custom config', () => {
    const points = generateGraph('sin(z)', { sampleCount: 64, domainStart: -2, domainEnd: 2 });
    expect(points.length).toBe(64);
    expect(points[0].x).toBe(-2);
    expect(points[63].x).toBe(2);
  });


  it('generates parametric heart-like points', () => {
    const points = generateParametricGraph('16*sin(t)^3', '13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t)', {
      sampleCount: 32,
      domainStart: 0,
      domainEnd: 6.283185307,
    });
    expect(points.length).toBe(32);
    expect(Math.max(...points.map((point) => point.y))).toBeGreaterThan(10);
  });

  it('maps frequencies to audible range', () => {
    const frequencies = mapToFrequencies([{ x: 0, y: 1 }, { x: 1, y: 2 }]);
    expect(frequencies[0]).toBeGreaterThanOrEqual(220);
    expect(frequencies[1]).toBeLessThanOrEqual(880);
  });
});
