import type { CoordinatePoint } from '../types/graph';

export interface FourierVector {
  frequency: number;
  real: number;
  imaginary: number;
  amplitude: number;
  phase: number;
}

export interface FourierArm {
  start: CoordinatePoint;
  end: CoordinatePoint;
  radius: number;
}

export interface FourierFrame {
  arms: FourierArm[];
  tip: CoordinatePoint;
}

const TWO_PI = Math.PI * 2;

/** Build DFT vectors from ordered drawing points. */
export function buildFourierVectors(points: CoordinatePoint[], vectorLimit: number): FourierVector[] {
  if (points.length === 0) return [];
  const limit = normalizeVectorLimit(vectorLimit, points.length);
  return createFrequencyList(points.length)
    .map((frequency) => createFourierVector(points, frequency))
    .sort(compareFourierVectors)
    .slice(0, limit);
}

/** Resolve epicycle arm positions for an animation progress value between 0 and 1. */
export function createFourierFrame(
  vectors: FourierVector[],
  progress: number,
  origin: CoordinatePoint,
): FourierFrame {
  let cursor = { ...origin };
  const arms = vectors.map((vector) => {
    const arm = createFourierArm(vector, progress, cursor);
    cursor = arm.end;
    return arm;
  });
  return { arms, tip: cursor };
}

function createFrequencyList(sampleCount: number): number[] {
  const half = Math.floor(sampleCount / 2);
  return Array.from({ length: sampleCount }, (_, index) => index - half);
}

function normalizeVectorLimit(vectorLimit: number, sampleCount: number): number {
  const finiteLimit = Number.isFinite(vectorLimit) ? Math.trunc(vectorLimit) : 1;
  return Math.min(sampleCount, Math.max(1, finiteLimit));
}

function createFourierVector(points: CoordinatePoint[], frequency: number): FourierVector {
  const coefficient = points.reduce((sum, point, index) => {
    return addCoefficient(sum, point, frequency, index, points.length);
  }, { real: 0, imaginary: 0 });
  const real = coefficient.real / points.length;
  const imaginary = coefficient.imaginary / points.length;
  return createVectorModel(frequency, real, imaginary);
}

function addCoefficient(
  sum: Pick<FourierVector, 'real' | 'imaginary'>,
  point: CoordinatePoint,
  frequency: number,
  index: number,
  sampleCount: number,
): Pick<FourierVector, 'real' | 'imaginary'> {
  const angle = TWO_PI * frequency * index / sampleCount;
  return {
    real: sum.real + point.x * Math.cos(angle) + point.y * Math.sin(angle),
    imaginary: sum.imaginary + point.y * Math.cos(angle) - point.x * Math.sin(angle),
  };
}

function createVectorModel(frequency: number, real: number, imaginary: number): FourierVector {
  return {
    frequency,
    real,
    imaginary,
    amplitude: Math.hypot(real, imaginary),
    phase: Math.atan2(imaginary, real),
  };
}

function compareFourierVectors(left: FourierVector, right: FourierVector): number {
  if (left.frequency === 0) return -1;
  if (right.frequency === 0) return 1;
  return right.amplitude - left.amplitude;
}

function createFourierArm(
  vector: FourierVector,
  progress: number,
  start: CoordinatePoint,
): FourierArm {
  const angle = TWO_PI * vector.frequency * progress + vector.phase;
  const end = {
    x: start.x + vector.amplitude * Math.cos(angle),
    y: start.y + vector.amplitude * Math.sin(angle),
  };
  return { start, end, radius: vector.amplitude };
}
