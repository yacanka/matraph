import type { CoordinatePoint } from '../types/graph';

export type StageMode = 'standard' | 'reel';

export interface StageLayout {
  frameOrigin: CoordinatePoint;
  vectorScale: number;
  traceStartX: number;
  traceWidth: number;
}

/** Resolve animation coordinates for the selected stage mode. */
export function createStageLayout(mode: StageMode, width: number, height: number): StageLayout {
  const center = { x: width / 2, y: height / 2 };
  if (mode === 'standard') {
    return { frameOrigin: center, vectorScale: 1, traceStartX: 0, traceWidth: width };
  }
  return {
    frameOrigin: { x: width * 0.2, y: center.y },
    vectorScale: 0.34,
    traceStartX: width * 0.34,
    traceWidth: width * 0.58,
  };
}

/** Map graph points into the reel waveform lane. */
export function createReelTraceSegment(points: CoordinatePoint[], layout: StageLayout): CoordinatePoint[] {
  const denominator = Math.max(points.length - 1, 1);
  return points.map((point, index) => ({
    x: layout.traceStartX + layout.traceWidth * (index / denominator),
    y: point.y,
  }));
}

/** Scale drawing points around zero so reel epicycles stay inside the stage. */
export function scaleDrawingPoints(points: CoordinatePoint[], scale: number): CoordinatePoint[] {
  return points.map((point) => ({ x: point.x * scale, y: point.y * scale }));
}

/** Build reel-mode Fourier input so the endpoint follows the graph's y-axis projection. */
export function createReelVectorPoints(points: CoordinatePoint[], layout: StageLayout): CoordinatePoint[] {
  return points.map((point) => ({ x: 0, y: point.y - layout.frameOrigin.y }));
}
