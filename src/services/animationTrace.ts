import type { CoordinatePoint } from '../types/graph';
import { createReelTraceSegment } from './stageLayout';
import type { StageLayout, StageMode } from './stageLayout';

export type AudioScale = 'free' | 'chromatic' | 'major' | 'harmonic-minor';

const SCALE_STEPS: Record<Exclude<AudioScale, 'free'>, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
};

/** Build the visible trace points for the selected stage mode. */
export function createTraceSource(
  mode: StageMode,
  points: CoordinatePoint[],
  layout: StageLayout,
): CoordinatePoint[] {
  if (mode === 'reel') return createReelTraceSegment(points, layout);
  return points;
}

/** Sample the current visible trace point for an animation progress value. */
export function sampleTracePoint(
  source: CoordinatePoint[],
  progress: number,
  fallback: CoordinatePoint,
): CoordinatePoint {
  const index = Math.min(Math.floor(progress * source.length), source.length - 1);
  return source[index] ?? fallback;
}

/** Map screen-space trace points to an audible frequency sequence. */
export function mapTraceFrequencies(
  source: CoordinatePoint[],
  referenceFrequency = 440,
  audioScale: AudioScale = 'free',
): number[] {
  if (source.length === 0) return [];
  const values = source.map((point) => point.y);
  const min = Math.min(...values);
  const span = Math.max(Math.max(...values) - min, Number.EPSILON);
  return values.map((value) => {
    const semitone = (1 - (value - min) / span) * 24 - 12;
    return frequencyFromSemitone(referenceFrequency, quantizeSemitone(semitone, audioScale));
  });
}

function frequencyFromSemitone(referenceFrequency: number, semitone: number): number {
  const base = Number.isFinite(referenceFrequency) ? referenceFrequency : 440;
  return base * 2 ** (semitone / 12);
}

function quantizeSemitone(semitone: number, audioScale: AudioScale): number {
  if (audioScale === 'free') return semitone;
  const rounded = Math.round(semitone);
  const octave = Math.floor(rounded / 12);
  const step = ((rounded % 12) + 12) % 12;
  return octave * 12 + nearestScaleStep(step, SCALE_STEPS[audioScale]);
}

function nearestScaleStep(step: number, scaleSteps: number[]): number {
  return scaleSteps.reduce((nearest, candidate) => {
    return Math.abs(candidate - step) < Math.abs(nearest - step) ? candidate : nearest;
  }, scaleSteps[0]);
}
