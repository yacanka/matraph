<template>
  <main class="container">
    <h1>Matraph (Vue 3)</h1>
    <p class="description">Fonksiyon ifadenizi ve grafik parametrelerini girip esnek şekilde görselleştirin.</p>

    <section class="panel">
      <label for="expression">Expression (variable: z)</label>
      <input id="expression" v-model="expression" placeholder="Example: sin(z) + z^2 / 5" />

      <div class="parameter-grid">
        <label>
          Sample count
          <input v-model.number="sampleCount" type="number" min="16" max="4096" step="1" />
        </label>
        <label>
          Domain start
          <input v-model.number="domainStart" type="number" step="0.5" />
        </label>
        <label>
          Domain end
          <input v-model.number="domainEnd" type="number" step="0.5" />
        </label>
      </div>

      <div class="actions">
        <button @click="buildGraph">Render Graph</button>
        <button :disabled="points.length === 0" @click="playSound">Play Audio</button>
      </div>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <svg viewBox="0 0 800 320" class="chart" role="img" aria-label="Function graph">
      <polyline :points="svgPoints" fill="none" stroke="#2c7be5" stroke-width="2" />
    </svg>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { playFrequencies } from './services/audioEngine';
import { generateGraph, mapToFrequencies } from './services/expressionEngine';
import type { GraphPoint } from './types/graph';

const expression = ref('sin(z) + z^2 / 5');
const sampleCount = ref(256);
const domainStart = ref(-10);
const domainEnd = ref(10);
const points = ref<GraphPoint[]>([]);
const errorMessage = ref('');

const svgPoints = computed(() => {
  if (points.value.length === 0) return '';
  const maxY = Math.max(...points.value.map((point) => point.y), 1);
  const spanY = 280;
  return points.value
    .map((point, index) => {
      const x = (index / (points.value.length - 1)) * 800;
      const y = 300 - (point.y / maxY) * spanY;
      return `${x},${y}`;
    })
    .join(' ');
});

function buildGraph(): void {
  try {
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
  const frequencies = mapToFrequencies(points.value);
  await playFrequencies(frequencies);
}
</script>

<style scoped>
.container { max-width: 940px; margin: 32px auto; font-family: Arial, sans-serif; }
.description { margin-bottom: 14px; color: #4b5563; }
.panel { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
input { width: 100%; padding: 8px; margin-top: 6px; box-sizing: border-box; }
.parameter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.actions { margin-top: 14px; display: flex; gap: 8px; }
button { padding: 8px 14px; }
.chart { width: 100%; border: 1px solid #ddd; margin-top: 16px; min-height: 320px; }
.error { color: #c0392b; margin-top: 8px; }
@media (max-width: 760px) { .parameter-grid { grid-template-columns: 1fr; } }
</style>
