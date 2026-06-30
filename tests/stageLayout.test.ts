import { describe, expect, it } from 'vitest';
import { createReelTracePoint, createStageLayout } from '../src/services/stageLayout';

describe('stageLayout', () => {
  it('keeps standard mode centered', () => {
    const layout = createStageLayout('standard', 800, 320);

    expect(layout.frameOrigin).toEqual({ x: 400, y: 160 });
  });

  it('moves reel epicycles left and trace to the right', () => {
    const layout = createStageLayout('reel', 800, 320);
    const tracePoint = createReelTracePoint(layout, { x: 20, y: 140 }, 0.5);

    expect(layout.frameOrigin.x).toBeLessThan(200);
    expect(tracePoint.x).toBeGreaterThan(450);
    expect(tracePoint.y).toBe(140);
  });
});
