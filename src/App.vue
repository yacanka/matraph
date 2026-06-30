<template>
  <main class="container">
    <h1>Matraph (Vue 3)</h1>
    <p class="description">Complex expression editörü ile fonksiyonları hızlıca oluşturup görselleştirin.</p>

    <section class="panel">
      <label for="expression">Expression (variable: z)</label>
      <textarea
        id="expression"
        ref="expressionField"
        v-model="expression"
        rows="4"
        placeholder="Example: |sin(z)| + sqrt(z^2 + 1) / (3 + cos(z))"
      />
      <small class="hint">Supports: |z|, √(), π, ∑(start,end,n), ×, ÷, and all mathjs functions.</small>

      <div class="token-grid">
        <button v-for="token in quickTokens" :key="token" class="chip" @click="insertToken(token)">{{ token }}</button>
      </div>

      <div class="parameter-grid">
        <label>Sample count<input v-model.number="sampleCount" type="number" min="16" max="4096" step="1" /></label>
        <label>Domain start<input v-model.number="domainStart" type="number" step="0.5" /></label>
        <label>Domain end<input v-model.number="domainEnd" type="number" step="0.5" /></label>
        <label>Fourier vectors<input v-model.number="fourierVectorCount" type="number" min="1" max="128" step="1" /></label>
        <label>Fourier speed<input v-model.number="fourierSpeed" type="number" min="0.25" max="4" step="0.25" /></label>
      </div>

      <div class="actions">
        <button @click="buildGraph">Render Graph</button>
        <button :disabled="points.length === 0" @click="playSound">Play Audio</button>
        <button :disabled="plot.projectedPoints.length < 2" @click="startFourierAnimation">Animate Fourier</button>
        <button :disabled="!isFourierAnimating" @click="stopFourierAnimation">Stop</button>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <svg :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`" class="chart" role="img" aria-label="Function graph">
      <path :d="plot.path" class="graph-path" />
      <g v-if="isFourierAnimating" class="fourier-layer">
        <circle v-for="(arm, index) in fourierArms" :key="`circle-${index}`" :cx="arm.start.x" :cy="arm.start.y" :r="arm.radius" class="fourier-circle" />
        <line v-for="(arm, index) in fourierArms" :key="`arm-${index}`" :x1="arm.start.x" :y1="arm.start.y" :x2="arm.end.x" :y2="arm.end.y" class="fourier-arm" />
        <path :d="fourierTracePath" class="fourier-trace" />
      </g>
    </svg>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { buildFourierVectors, createFourierFrame } from './services/fourierEngine';
import { playFrequencies } from './services/audioEngine';
import { generateGraph, mapToFrequencies } from './services/expressionEngine';
import { createGraphPlot, toCenteredLongestSegment } from './services/graphPlotter';
import type { CoordinatePoint, GraphPoint } from './types/graph';
import type { FourierArm, FourierVector } from './services/fourierEngine';

const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const CHART_CENTER = { x: CHART_WIDTH / 2, y: CHART_HEIGHT / 2 };
const FOURIER_DURATION_MS = 8000;
const FOURIER_TRACE_LIMIT = 640;
const expression = ref('sin(z) + z^2 / 5');
const expressionField = ref<HTMLTextAreaElement | null>(null);
const sampleCount = ref(256);
const domainStart = ref(-10);
const domainEnd = ref(10);
const fourierVectorCount = ref(48);
const fourierSpeed = ref(1);
const points = ref<GraphPoint[]>([]);
const errorMessage = ref('');
const isFourierAnimating = ref(false);
const fourierVectors = ref<FourierVector[]>([]);
const fourierArms = ref<FourierArm[]>([]);
const fourierTrace = ref<CoordinatePoint[]>([]);
const quickTokens = ['sin()', 'cos()', 'tan()', 'sqrt()', '√()', 'log()', 'abs()', '|z|', '∑(1,5,n)', 'π', '^', '×', '÷', '( )'];
let animationFrameId: number | null = null;
let animationStartMs = 0;
let previousFourierProgress = 0;

const plot = computed(() => createGraphPlot(points.value, { width: CHART_WIDTH, height: CHART_HEIGHT }));
const fourierTracePath = computed(() => toSvgPath(fourierTrace.value));

function insertToken(token: string): void {
  const field = expressionField.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const snippet = token === '( )' ? '()' : token;
  expression.value = `${expression.value.slice(0, start)}${snippet}${expression.value.slice(end)}`;
  nextTick(() => {
    field.focus();
    const cursor = token.endsWith('()') || token === '( )' ? start + snippet.length - 1 : start + snippet.length;
    field.setSelectionRange(cursor, cursor);
  });
}

function buildGraph(): void {
  try {
    stopFourierAnimation();
    errorMessage.value = '';
    points.value = generateGraph(expression.value, {
      sampleCount: sampleCount.value,
      domainStart: domainStart.value,
      domainEnd: domainEnd.value,
    });
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function playSound(): Promise<void> {
  await playFrequencies(mapToFrequencies(points.value));
}

function startFourierAnimation(): void {
  const drawingPoints = toCenteredLongestSegment(plot.value.projectedPoints, CHART_CENTER);
  if (drawingPoints.length < 2) {
    errorMessage.value = 'Fourier animation requires at least two drawable points.';
    return;
  }
  errorMessage.value = '';
  fourierVectors.value = buildFourierVectors(drawingPoints, fourierVectorCount.value);
  resetFourierAnimation();
  animationFrameId = window.requestAnimationFrame(animateFourier);
}

function stopFourierAnimation(): void {
  if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  isFourierAnimating.value = false;
}

function animateFourier(timestamp: number): void {
  if (!isFourierAnimating.value) return;
  if (animationStartMs === 0) animationStartMs = timestamp;
  const progress = calculateFourierProgress(timestamp);
  renderFourierFrame(progress);
  previousFourierProgress = progress;
  animationFrameId = window.requestAnimationFrame(animateFourier);
}

function calculateFourierProgress(timestamp: number): number {
  const inputSpeed = Number.isFinite(fourierSpeed.value) ? fourierSpeed.value : 1;
  const speed = Math.max(inputSpeed, 0.25);
  const duration = FOURIER_DURATION_MS / speed;
  return ((timestamp - animationStartMs) % duration) / duration;
}

function renderFourierFrame(progress: number): void {
  const frame = createFourierFrame(fourierVectors.value, progress, CHART_CENTER);
  const trace = progress < previousFourierProgress ? [frame.tip] : [...fourierTrace.value, frame.tip];
  fourierArms.value = frame.arms;
  fourierTrace.value = trace.slice(-FOURIER_TRACE_LIMIT);
}

function resetFourierAnimation(): void {
  stopFourierAnimation();
  isFourierAnimating.value = true;
  fourierTrace.value = [];
  animationStartMs = 0;
  previousFourierProgress = 0;
}

function toSvgPath(sourcePoints: CoordinatePoint[]): string {
  return sourcePoints.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(' ');
}

onBeforeUnmount(stopFourierAnimation);
</script>

<style scoped>
.container { max-width: 940px; margin: 32px auto; font-family: Arial, sans-serif; }
.description { margin-bottom: 14px; color: #4b5563; }
.panel { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
textarea, input { width: 100%; padding: 8px; margin-top: 6px; box-sizing: border-box; }
textarea { resize: vertical; min-height: 88px; }
.hint { display: block; color: #6b7280; margin-top: 6px; }
.token-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.chip { font-size: 12px; padding: 4px 8px; }
.parameter-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 12px; }
.actions { margin-top: 14px; display: flex; gap: 8px; }
button { padding: 8px 14px; }
.chart { width: 100%; border: 1px solid #ddd; margin-top: 16px; min-height: 320px; }
.graph-path { fill: none; stroke: #2c7be5; stroke-width: 2; }
.fourier-circle { fill: none; stroke: rgba(17, 24, 39, 0.22); stroke-width: 1; }
.fourier-arm { stroke: #111827; stroke-width: 1; }
.fourier-trace { fill: none; stroke: #e11d48; stroke-width: 2; }
.error { color: #c0392b; margin-top: 8px; }
@media (max-width: 760px) { .parameter-grid { grid-template-columns: 1fr; } }
</style>
