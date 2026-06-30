<template>
  <main class="app-shell">
    <header class="top-bar">
      <div>
        <p class="eyebrow">Fourier Series</p>
        <h1>Matraph</h1>
      </div>

      <PresetLibrary
        :active-category="activeCategory"
        :active-preset-id="activePresetId"
        :presets="FORMULA_PRESETS"
        @category-change="setPresetCategory"
        @preset-select="applyPreset"
      />
    </header>

    <ControlPanel
      v-model:audio-scale="audioScale"
      v-model:domain-end="domainEnd"
      v-model:domain-start="domainStart"
      v-model:expression="expression"
      v-model:fourier-speed="fourierSpeed"
      v-model:fourier-vector-count="fourierVectorCount"
      v-model:graph-zoom="graphZoom"
      v-model:reference-frequency="referenceFrequency"
      v-model:sample-count="sampleCount"
      :can-animate="plot.projectedPoints.length >= 2"
      :error-message="errorMessage"
      :has-points="plot.projectedPoints.length > 0"
      :is-animating="isFourierAnimating"
      :stage-mode="stageMode"
      @animate="startFourierAnimation"
      @audio="playSound"
      @custom-expression="markCustomExpression"
      @mode-change="setStageMode"
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
      :plot-paths="plot.paths"
      :sample-count="sampleCount"
      :stage-mode="stageMode"
      :trace="fourierTrace"
      :width="CHART_WIDTH"
    />

    <SignalMonitors
      :audio-scale="audioScale"
      :is-animating="isFourierAnimating"
      :reference-frequency="referenceFrequency"
      :sample-count="sampleCount"
      :stage-mode="stageMode"
      :trace-count="fourierTrace.length"
      :y-range="plot.yRange"
      :zoom="graphZoom"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ControlPanel from './components/ControlPanel.vue';
import PresetLibrary from './components/PresetLibrary.vue';
import SignalMonitors from './components/SignalMonitors.vue';
import StagePanel from './components/StagePanel.vue';
import { useFourierPlayback } from './composables/useFourierPlayback';
import type { AudioScale } from './services/animationTrace';
import { findFormulaPreset, FORMULA_PRESETS, getDefaultFormulaPreset } from './services/formulaPresets';
import type { FormulaCategory, FormulaPreset } from './services/formulaPresets';
import { expressionGraphEngine } from './services/graphEngine';
import { createGraphPlot } from './services/graphPlotter';
import type { StageMode } from './services/stageLayout';
import type { GraphRender } from './types/graph';

const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const CHART_CENTER = { x: CHART_WIDTH / 2, y: CHART_HEIGHT / 2 };
const REFERENCE_BASELINE_Y = CHART_CENTER.y + 44;
const FOURIER_DURATION_MS = 8000;
const FOURIER_TRACE_LIMIT = 4096;
const defaultPreset = getDefaultFormulaPreset();
const expression = ref(defaultPreset.expression);
const sampleCount = ref(defaultPreset.sampleCount);
const domainStart = ref(defaultPreset.domainStart);
const domainEnd = ref(defaultPreset.domainEnd);
const fourierVectorCount = ref(defaultPreset.vectorCount);
const fourierSpeed = ref(1);
const graphZoom = ref(1);
const referenceFrequency = ref(440);
const audioScale = ref<AudioScale>('free');
const graph = ref<GraphRender | null>(null);
const errorMessage = ref('');
const activePresetId = ref(defaultPreset.id);
const activeCategory = ref<FormulaCategory>(defaultPreset.category);
const stageMode = ref<StageMode>('standard');

const plot = computed(() => createGraphPlot(graph.value?.series ?? [], {
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
  zoom: graphZoom.value,
}));
const activeFormulaLabel = computed(() => findFormulaPreset(activePresetId.value)?.label ?? 'Custom Function');
const playback = useFourierPlayback({
  center: CHART_CENTER,
  durationMs: FOURIER_DURATION_MS,
  height: CHART_HEIGHT,
  onError: (message) => { errorMessage.value = message; },
  plot,
  referenceFrequency,
  speed: fourierSpeed,
  stageMode,
  audioScale,
  traceLimit: FOURIER_TRACE_LIMIT,
  vectorCount: fourierVectorCount,
  width: CHART_WIDTH,
});
const isFourierAnimating = playback.isAnimating;
const fourierArms = playback.arms;
const fourierTrace = playback.trace;

function applyPreset(preset: FormulaPreset): void {
  activePresetId.value = preset.id;
  activeCategory.value = preset.category;
  expression.value = preset.expression;
  sampleCount.value = preset.sampleCount;
  domainStart.value = preset.domainStart;
  domainEnd.value = preset.domainEnd;
  fourierVectorCount.value = preset.vectorCount;
  buildGraph();
}

function buildGraph(): void {
  try {
    playback.stop();
    errorMessage.value = '';
    graph.value = expressionGraphEngine.render({
      expression: expression.value,
      config: {
        sampleCount: sampleCount.value,
        domainStart: domainStart.value,
        domainEnd: domainEnd.value,
      },
    });
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

function playSound(): void {
  playback.start();
}

function startFourierAnimation(): void {
  errorMessage.value = '';
  playback.start();
}

function stopFourierAnimation(): void {
  playback.stop();
}

function markCustomExpression(): void {
  activePresetId.value = 'custom';
}

function setStageMode(mode: StageMode): void {
  stageMode.value = mode;
  if (isFourierAnimating.value) playback.start();
}

function setPresetCategory(category: FormulaCategory): void {
  activeCategory.value = category;
}

onMounted(buildGraph);
onBeforeUnmount(playback.stop);
</script>
