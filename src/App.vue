<template>
  <main class="app-shell">
    <header class="top-bar">
      <div>
        <p class="eyebrow">Fourier Series</p>
        <h1>Matraph</h1>
      </div>

      <nav class="preset-row" aria-label="Formula presets">
        <button
          v-for="preset in FORMULA_PRESETS"
          :key="preset.id"
          class="preset-button"
          :class="{ selected: preset.id === activePresetId }"
          type="button"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </nav>
    </header>

    <ControlPanel
      v-model:domain-end="domainEnd"
      v-model:domain-start="domainStart"
      v-model:expression="expression"
      v-model:fourier-speed="fourierSpeed"
      v-model:fourier-vector-count="fourierVectorCount"
      v-model:sample-count="sampleCount"
      :can-animate="plot.projectedPoints.length >= 2"
      :error-message="errorMessage"
      :has-points="points.length > 0"
      :is-animating="isFourierAnimating"
      @animate="startFourierAnimation"
      @audio="playSound"
      @custom-expression="markCustomExpression"
      @render="buildGraph"
      @stop="stopFourierAnimation"
    />

    <StagePanel
      :active-label="activeFormulaLabel"
      :arms="fourierArms"
      :baseline-y="REFERENCE_BASELINE_Y"
      :center-y="CHART_CENTER.y"
      :expression="expression"
      :height="CHART_HEIGHT"
      :is-animating="isFourierAnimating"
      :plot-path="plot.path"
      :sample-count="sampleCount"
      :trace="fourierTrace"
      :width="CHART_WIDTH"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ControlPanel from './components/ControlPanel.vue';
import StagePanel from './components/StagePanel.vue';
import { playFrequencies } from './services/audioEngine';
import { generateGraph, mapToFrequencies } from './services/expressionEngine';
import { buildFourierVectors, createFourierFrame } from './services/fourierEngine';
import type { FourierArm, FourierVector } from './services/fourierEngine';
import { findFormulaPreset, FORMULA_PRESETS, getDefaultFormulaPreset } from './services/formulaPresets';
import type { FormulaPreset } from './services/formulaPresets';
import { createGraphPlot, toCenteredLongestSegment } from './services/graphPlotter';
import type { CoordinatePoint, GraphPoint } from './types/graph';

const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const CHART_CENTER = { x: CHART_WIDTH / 2, y: CHART_HEIGHT / 2 };
const REFERENCE_BASELINE_Y = CHART_CENTER.y + 44;
const FOURIER_DURATION_MS = 8000;
const FOURIER_TRACE_LIMIT = 640;
const defaultPreset = getDefaultFormulaPreset();
const expression = ref(defaultPreset.expression);
const sampleCount = ref(defaultPreset.sampleCount);
const domainStart = ref(defaultPreset.domainStart);
const domainEnd = ref(defaultPreset.domainEnd);
const fourierVectorCount = ref(defaultPreset.vectorCount);
const fourierSpeed = ref(1);
const points = ref<GraphPoint[]>([]);
const errorMessage = ref('');
const activePresetId = ref(defaultPreset.id);
const isFourierAnimating = ref(false);
const fourierVectors = ref<FourierVector[]>([]);
const fourierArms = ref<FourierArm[]>([]);
const fourierTrace = ref<CoordinatePoint[]>([]);
let animationFrameId: number | null = null;
let animationStartMs = 0;
let previousFourierProgress = 0;

const plot = computed(() => createGraphPlot(points.value, { width: CHART_WIDTH, height: CHART_HEIGHT }));
const activeFormulaLabel = computed(() => findFormulaPreset(activePresetId.value)?.label ?? 'Custom Function');

function applyPreset(preset: FormulaPreset): void {
  activePresetId.value = preset.id;
  expression.value = preset.expression;
  sampleCount.value = preset.sampleCount;
  domainStart.value = preset.domainStart;
  domainEnd.value = preset.domainEnd;
  fourierVectorCount.value = preset.vectorCount;
  buildGraph();
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

function markCustomExpression(): void {
  activePresetId.value = 'custom';
}

onMounted(buildGraph);
onBeforeUnmount(stopFourierAnimation);
</script>
