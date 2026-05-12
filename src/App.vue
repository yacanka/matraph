<template>
  <main class="container">
    <h1>Matraph (Vue 3)</h1>
    <p class="description">Complex expression editörü ile fonksiyonları hızlıca oluşturup görselleştirin.</p>

    <section class="panel">
      <label><input v-model="isParametric" type="checkbox" /> Parametric mode (x(t), y(t))</label>
      <template v-if="!isParametric">
        <label for="expression">Expression (variable: z)</label>
        <textarea id="expression" ref="expressionField" v-model="expression" rows="4" />
      </template>
      <template v-else>
        <label for="expressionX">X expression (variable: t)</label>
        <textarea id="expressionX" ref="expressionField" v-model="expressionX" rows="3" />
        <label for="expressionY">Y expression (variable: t)</label>
        <textarea id="expressionY" v-model="expressionY" rows="3" />
        <small class="hint">Heart preset: x=16*sin(t)^3, y=13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t)</small>
      </template>
      <small class="hint">Supports: |z|, √(), π, ∑(start,end,n), ×, ÷, and all mathjs functions.</small>
      <div class="token-grid"><button v-for="token in quickTokens" :key="token" class="chip" @click="insertToken(token)">{{ token }}</button></div>

      <div class="parameter-grid">
        <label>Sample count<input v-model.number="sampleCount" type="number" min="16" max="4096" step="1" /></label>
        <label>Domain start<input v-model.number="domainStart" type="number" step="0.5" /></label>
        <label>Domain end<input v-model.number="domainEnd" type="number" step="0.5" /></label>
      </div>
      <div class="axis-grid"><label><input v-model="showXAxis" type="checkbox" /> Show X axis</label><label><input v-model="showYAxis" type="checkbox" /> Show Y axis</label></div>
      <div class="actions"><button @click="buildGraph">Render Graph</button><button :disabled="points.length === 0" @click="playSound">Play Audio</button></div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <svg viewBox="0 0 800 320" class="chart" role="img" aria-label="Function graph">
      <line v-if="showXAxis && axis.y !== null" x1="0" :y1="axis.y" x2="800" :y2="axis.y" stroke="#9ca3af" stroke-width="1" />
      <line v-if="showYAxis && axis.x !== null" :x1="axis.x" y1="0" :x2="axis.x" y2="320" stroke="#9ca3af" stroke-width="1" />
      <path :d="svgPath" fill="none" stroke="#2c7be5" stroke-width="2" />
    </svg>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { playFrequencies } from './services/audioEngine';
import { generateGraph, generateParametricGraph, mapToFrequencies } from './services/expressionEngine';
import type { GraphPoint } from './types/graph';

const expression = ref('sin(z) + z^2 / 5');
const expressionX = ref('16*sin(t)^3');
const expressionY = ref('13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t)');
const expressionField = ref<HTMLTextAreaElement | null>(null);
const isParametric = ref(false);
const sampleCount = ref(256);
const domainStart = ref(-10);
const domainEnd = ref(10);
const showXAxis = ref(true);
const showYAxis = ref(true);
const points = ref<GraphPoint[]>([]);
const errorMessage = ref('');
const quickTokens = ['sin()', 'cos()', 'tan()', 'sqrt()', '√()', 'log()', 'abs()', '|z|', '∑(1,5,n)', 'π', '^', '×', '÷', '( )'];
const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const CHART_PADDING = 20;
const DISCONTINUITY_FACTOR = 0.45;

const validPoints = computed(() => points.value.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
const bounds = computed(() => {
  if (!validPoints.value.length) return null;
  const xValues = validPoints.value.map((point) => point.x);
  const yValues = validPoints.value.map((point) => point.y);
  return { minX: Math.min(...xValues), maxX: Math.max(...xValues), minY: Math.min(...yValues), maxY: Math.max(...yValues) };
});

const axis = computed(() => {
  if (!bounds.value) return { x: null, y: null };
  const xSpan = bounds.value.maxX - bounds.value.minX || 1;
  const ySpan = bounds.value.maxY - bounds.value.minY || 1;
  const x = CHART_PADDING + ((0 - bounds.value.minX) / xSpan) * (CHART_WIDTH - CHART_PADDING * 2);
  const y = CHART_HEIGHT - CHART_PADDING - ((0 - bounds.value.minY) / ySpan) * (CHART_HEIGHT - CHART_PADDING * 2);
  return { x: x >= 0 && x <= CHART_WIDTH ? x : null, y: y >= 0 && y <= CHART_HEIGHT ? y : null };
});

const svgPath = computed(() => {
  if (!bounds.value || !validPoints.value.length) return '';
  const ySpan = bounds.value.maxY - bounds.value.minY || 1;
  return buildSvgPath(validPoints.value, bounds.value, ySpan * DISCONTINUITY_FACTOR);
});

function buildSvgPath(dataPoints: GraphPoint[], chartBounds: Bounds, jumpLimit: number): string {
  const xSpan = chartBounds.maxX - chartBounds.minX || 1;
  const ySpan = chartBounds.maxY - chartBounds.minY || 1;
  const scaled = dataPoints.map((point) => ({ x: CHART_PADDING + ((point.x - chartBounds.minX) / xSpan) * (CHART_WIDTH - CHART_PADDING * 2), y: CHART_HEIGHT - CHART_PADDING - ((point.y - chartBounds.minY) / ySpan) * (CHART_HEIGHT - CHART_PADDING * 2), rawY: point.y }));
  return scaled.reduce((path, point, index) => {
    const previous = scaled[index - 1];
    const broken = !previous || Math.abs(point.rawY - previous.rawY) > jumpLimit;
    return `${path}${broken ? ' M' : ' L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }, '').trim();
}

function insertToken(token: string): void {
  const field = expressionField.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const snippet = token === '( )' ? '()' : token;
  expression.value = `${expression.value.slice(0, start)}${snippet}${expression.value.slice(end)}`;
  nextTick(() => field.setSelectionRange(start + snippet.length, start + snippet.length));
}

function buildGraph(): void {
  try {
    errorMessage.value = '';
    points.value = isParametric.value
      ? generateParametricGraph(expressionX.value, expressionY.value, { sampleCount: sampleCount.value, domainStart: domainStart.value, domainEnd: domainEnd.value })
      : generateGraph(expression.value, { sampleCount: sampleCount.value, domainStart: domainStart.value, domainEnd: domainEnd.value });
  } catch (error) { errorMessage.value = (error as Error).message; }
}

async function playSound(): Promise<void> { await playFrequencies(mapToFrequencies(points.value)); }
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
</script>

<style scoped>
.container { max-width: 940px; margin: 32px auto; font-family: Arial, sans-serif; }
.description { margin-bottom: 14px; color: #4b5563; }
.panel { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
textarea, input { width: 100%; padding: 8px; margin-top: 6px; box-sizing: border-box; }
textarea { resize: vertical; min-height: 64px; }
.hint { display: block; color: #6b7280; margin-top: 6px; }
.token-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.chip { font-size: 12px; padding: 4px 8px; }
.parameter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.axis-grid { display: flex; gap: 16px; margin-top: 8px; }
.actions { margin-top: 14px; display: flex; gap: 8px; }
button { padding: 8px 14px; }
.chart { width: 100%; border: 1px solid #ddd; margin-top: 16px; min-height: 320px; }
.error { color: #c0392b; margin-top: 8px; }
@media (max-width: 760px) { .parameter-grid { grid-template-columns: 1fr; } }
</style>
