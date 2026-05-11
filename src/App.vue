<template>
  <main class="container">
    <h1>Matraph (Vue 3)</h1>
    <input v-model="expression" placeholder="Example: sin(z) + z^2" />
    <button @click="buildGraph">Render</button>
    <button :disabled="points.length === 0" @click="playSound">Play Audio</button>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <svg viewBox="0 0 800 300" class="chart">
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
const points = ref<GraphPoint[]>([]);
const errorMessage = ref('');

const svgPoints = computed(() => {
  if (points.value.length === 0) return '';
  const maxY = Math.max(...points.value.map((point) => point.y), 1);
  return points.value
    .map((point, index) => {
      const x = (index / (points.value.length - 1)) * 800;
      const y = 280 - (point.y / maxY) * 260;
      return `${x},${y}`;
    })
    .join(' ');
});

function buildGraph(): void {
  try {
    errorMessage.value = '';
    points.value = generateGraph(expression.value);
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
.container { max-width: 900px; margin: 40px auto; font-family: Arial, sans-serif; }
input { width: 60%; padding: 8px; margin-right: 8px; }
button { margin-right: 8px; padding: 8px 14px; }
.chart { width: 100%; border: 1px solid #ddd; margin-top: 16px; }
.error { color: #c0392b; }
</style>
