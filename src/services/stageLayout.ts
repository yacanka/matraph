import type { CoordinatePoint } from '../types/graph';

export type StageMode = 'standard' | 'reel';

export interface StageLayout {
  frameOrigin: CoordinatePoint;
  traceStartX: number;
  traceWidth: number;
}

/** Resolve animation coordinates for the selected stage mode. */
export function createStageLayout(mode: StageMode, width: number, height: number): StageLayout {
  const center = { x: width / 2, y: height / 2 };
  if (mode === 'standard') return { frameOrigin: center, traceStartX: 0, traceWidth: width };
  return {
    frameOrigin: { x: width * 0.16, y: center.y },
    traceStartX: width * 0.34,
    traceWidth: width * 0.58,
  };
}

/** Map an epicycle tip into the right-flowing waveform used by reel mode. */
export function createReelTracePoint(layout: StageLayout, tip: CoordinatePoint, progress: number): CoordinatePoint {
  return {
    x: layout.traceStartX + layout.traceWidth * progress,
    y: tip.y,
  };
}
