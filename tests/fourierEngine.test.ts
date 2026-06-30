import { describe, expect, it } from 'vitest';
import { buildFourierVectors, createFourierFrame } from '../src/services/fourierEngine';
import type { CoordinatePoint } from '../src/types/graph';

describe('fourierEngine', () => {
  it('detects the unit circle as frequency one', () => {
    const points = createCirclePoints(64);
    const vectors = buildFourierVectors(points, 4);
    const dominant = vectors.find((vector) => vector.frequency === 1);

    expect(dominant?.amplitude).toBeCloseTo(1, 5);
  });

  it('reconstructs constant points with the zero-frequency vector', () => {
    const points: CoordinatePoint[] = Array.from({ length: 8 }, () => ({ x: 12, y: -5 }));
    const vectors = buildFourierVectors(points, 1);
    const frame = createFourierFrame(vectors, 0.5, { x: 100, y: 100 });

    expect(vectors[0].frequency).toBe(0);
    expect(frame.tip.x).toBeCloseTo(112, 5);
    expect(frame.tip.y).toBeCloseTo(95, 5);
  });

  it('falls back to one vector for invalid vector limits', () => {
    const vectors = buildFourierVectors(createCirclePoints(8), Number.NaN);

    expect(vectors).toHaveLength(1);
  });
});

function createCirclePoints(count: number): CoordinatePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.PI * 2 * index / count;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}
