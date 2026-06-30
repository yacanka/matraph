import { describe, expect, it } from 'vitest';
import { createReelVectorPoints, createStageLayout } from '../src/services/stageLayout';

describe('stageLayout', () => {
  it('keeps standard mode centered', () => {
    const layout = createStageLayout('standard', 800, 320);

    expect(layout.frameOrigin).toEqual({ x: 400, y: 160 });
  });

  it('moves reel epicycles left and trace to the right', () => {
    const layout = createStageLayout('reel', 800, 320);

    expect(layout.frameOrigin.x).toBe(160);
    expect(layout.traceStartX).toBeGreaterThan(250);
  });

  it('keeps reel vector input on the projection axis', () => {
    const layout = createStageLayout('reel', 800, 320);
    const points = createReelVectorPoints([{ x: 20, y: 140 }, { x: 80, y: 200 }], layout);

    expect(points.every((point) => point.x === 0)).toBe(true);
    expect(points[0].y).toBe(-20);
  });
});
