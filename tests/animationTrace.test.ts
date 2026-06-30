import { describe, expect, it } from 'vitest';
import { createTraceSource, mapTraceFrequencies, sampleTracePoint } from '../src/services/animationTrace';
import { createStageLayout } from '../src/services/stageLayout';

describe('animationTrace', () => {
  it('keeps standard trace aligned with graph points', () => {
    const points = [{ x: 10, y: 20 }, { x: 30, y: 40 }];
    const layout = createStageLayout('standard', 800, 320);

    expect(createTraceSource('standard', points, layout)).toEqual(points);
  });

  it('samples the visible trace by animation progress', () => {
    const points = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];

    expect(sampleTracePoint(points, 0.5, { x: 0, y: 0 })).toEqual({ x: 30, y: 40 });
  });

  it('maps higher screen positions to higher frequencies', () => {
    const frequencies = mapTraceFrequencies([{ x: 0, y: 220 }, { x: 1, y: 20 }]);

    expect(frequencies[1]).toBeGreaterThan(frequencies[0]);
  });

  it('quantizes frequencies to musical scale steps', () => {
    const frequencies = mapTraceFrequencies([
      { x: 0, y: 220 },
      { x: 1, y: 120 },
      { x: 2, y: 20 },
    ], 440, 'major');

    expect(frequencies.every((frequency) => Number.isFinite(frequency))).toBe(true);
    expect(new Set(frequencies.map((frequency) => Math.round(frequency))).size).toBeGreaterThan(1);
  });
});
