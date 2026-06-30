import { ref } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { startFrequencySequence } from '../services/audioEngine';
import type { AudioPlayback } from '../services/audioEngine';
import { createTraceSource, mapTraceFrequencies, sampleTracePoint } from '../services/animationTrace';
import type { AudioScale } from '../services/animationTrace';
import { buildFourierVectors, createFourierFrame } from '../services/fourierEngine';
import type { FourierArm, FourierVector } from '../services/fourierEngine';
import type { GraphPlot } from '../services/graphPlotter';
import { toCenteredLongestSegment, toLongestSegment } from '../services/graphPlotter';
import { createReelVectorPoints, createStageLayout, scaleDrawingPoints } from '../services/stageLayout';
import type { StageMode } from '../services/stageLayout';
import type { CoordinatePoint } from '../types/graph';

interface FourierPlaybackOptions {
  center: CoordinatePoint;
  durationMs: number;
  height: number;
  onError: (message: string) => void;
  plot: ComputedRef<GraphPlot>;
  referenceFrequency: Ref<number>;
  speed: Ref<number>;
  stageMode: Ref<StageMode>;
  audioScale: Ref<AudioScale>;
  traceLimit: number;
  vectorCount: Ref<number>;
  width: number;
}

/** Coordinate Fourier animation and audio on one shared timeline. */
export function useFourierPlayback(options: FourierPlaybackOptions) {
  const isAnimating = ref(false);
  const vectors = ref<FourierVector[]>([]);
  const arms = ref<FourierArm[]>([]);
  const trace = ref<CoordinatePoint[]>([]);
  const traceSource = ref<CoordinatePoint[]>([]);
  let frameId: number | null = null;
  let startMs = 0;
  let previousProgress = 0;
  let audioPlayback: AudioPlayback | null = null;

  function start(): void {
    const graphTrace = toLongestSegment(options.plot.value.projectedPoints);
    if (graphTrace.length < 2) return options.onError('Fourier animation requires at least two drawable points.');
    const layout = createStageLayout(options.stageMode.value, options.width, options.height);
    const vectorInput = createVectorInput(graphTrace, layout);
    vectors.value = buildFourierVectors(vectorInput, options.vectorCount.value);
    traceSource.value = createTraceSource(options.stageMode.value, graphTrace, layout);
    reset();
    startAudio();
    frameId = window.requestAnimationFrame(animate);
  }

  function stop(): void {
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
    isAnimating.value = false;
    stopAudio();
  }

  function animate(timestamp: number): void {
    if (!isAnimating.value) return;
    if (startMs === 0) startMs = timestamp;
    const progress = calculateProgress(timestamp);
    render(progress);
    if (progress < previousProgress) startAudio();
    previousProgress = progress;
    frameId = window.requestAnimationFrame(animate);
  }

  function render(progress: number): void {
    const layout = createStageLayout(options.stageMode.value, options.width, options.height);
    const frame = createFourierFrame(vectors.value, progress, layout.frameOrigin);
    const tracePoint = sampleTracePoint(traceSource.value, progress, options.center);
    const nextTrace = progress < previousProgress ? [tracePoint] : [...trace.value, tracePoint];
    arms.value = frame.arms;
    trace.value = nextTrace.slice(-options.traceLimit);
  }

  function reset(): void {
    stop();
    isAnimating.value = true;
    trace.value = [];
    startMs = 0;
    previousProgress = 0;
  }

  function calculateProgress(timestamp: number): number {
    return ((timestamp - startMs) % currentDurationMs()) / currentDurationMs();
  }

  function startAudio(): void {
    stopAudio();
    const frequencies = mapTraceFrequencies(
      traceSource.value,
      options.referenceFrequency.value,
      options.audioScale.value,
    );
    if (frequencies.length === 0) return;
    audioPlayback = startFrequencySequence(frequencies, currentDurationMs() / 1000);
  }

  function stopAudio(): void {
    audioPlayback?.stop();
    audioPlayback = null;
  }

  function currentDurationMs(): number {
    const inputSpeed = Number.isFinite(options.speed.value) ? options.speed.value : 1;
    return options.durationMs / Math.max(inputSpeed, 0.25);
  }

  function createVectorInput(graphTrace: CoordinatePoint[], layout: ReturnType<typeof createStageLayout>): CoordinatePoint[] {
    if (options.stageMode.value === 'reel') return createReelVectorPoints(graphTrace, layout);
    const drawingPoints = toCenteredLongestSegment(options.plot.value.projectedPoints, options.center);
    return scaleDrawingPoints(drawingPoints, layout.vectorScale);
  }

  return { arms, isAnimating, start, stop, trace };
}
