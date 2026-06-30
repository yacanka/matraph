import { describe, expect, it } from 'vitest';
import { createGraphPlot, toCenteredLongestSegment } from '../src/services/graphPlotter';
import type { GraphPoint } from '../src/types/graph';

describe('graphPlotter', () => {
  it('does not emit invalid SVG coordinates for graph gaps', () => {
    const points: GraphPoint[] = [{ x: -1, y: -1 }, { x: 0, y: null }, { x: 1, y: 1 }];
    const plot = createGraphPlot(points, { width: 100, height: 100, padding: 10 });

    expect(plot.path).not.toContain('NaN');
    expect(plot.path).toBe('M 10 90 M 90 10');
  });

  it('breaks a path at likely sign-changing discontinuities', () => {
    const points: GraphPoint[] = [{ x: -1, y: -100 }, { x: 0, y: 100 }, { x: 1, y: 90 }];
    const plot = createGraphPlot(points, { width: 100, height: 100, padding: 10 });

    expect(plot.path).toContain('M 10 90 M 50 10 L 90 14');
  });

  it('returns centered points from the longest connected segment', () => {
    const plot = createGraphPlot([
      { x: -2, y: -1 },
      { x: -1, y: null },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ], { width: 100, height: 100, padding: 10 });

    const centered = toCenteredLongestSegment(plot.projectedPoints, { x: 50, y: 50 });
    expect(centered).toHaveLength(2);
    expect(centered[0].x).toBeGreaterThanOrEqual(0);
  });

  it('narrows the visible y range when zoom increases', () => {
    const points: GraphPoint[] = [{ x: 0, y: -10 }, { x: 1, y: 10 }];
    const normal = createGraphPlot(points, { width: 100, height: 100, padding: 10, zoom: 1 });
    const zoomed = createGraphPlot(points, { width: 100, height: 100, padding: 10, zoom: 2 });

    expect(zoomed.yRange[1] - zoomed.yRange[0]).toBeLessThan(normal.yRange[1] - normal.yRange[0]);
  });
});
