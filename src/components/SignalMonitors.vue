<template>
  <section class="monitor-panel" aria-label="Signal monitors">
    <header class="monitor-header">
      <div>
        <p class="eyebrow">Laboratory Monitors</p>
        <h2>{{ props.isAnimating ? 'Active' : 'Standby' }}</h2>
      </div>
      <span class="sample-pill">{{ props.stageMode }}</span>
    </header>

    <div class="monitor-grid">
      <div class="monitor-cell"><span>Trace</span><strong>{{ props.traceCount }}</strong></div>
      <div class="monitor-cell"><span>Y Range</span><strong>{{ formatRange(props.yRange) }}</strong></div>
      <div class="monitor-cell"><span>Audio</span><strong>{{ props.referenceFrequency }} Hz</strong></div>
      <div class="monitor-cell"><span>Scale</span><strong>{{ props.audioScale }}</strong></div>
      <div class="monitor-cell"><span>Zoom</span><strong>{{ props.zoom.toFixed(1) }}x</strong></div>
      <div class="monitor-cell"><span>Samples</span><strong>{{ props.sampleCount }}</strong></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { AudioScale } from '../services/animationTrace';
import type { StageMode } from '../services/stageLayout';

interface SignalMonitorsProps {
  audioScale: AudioScale;
  isAnimating: boolean;
  referenceFrequency: number;
  sampleCount: number;
  stageMode: StageMode;
  traceCount: number;
  yRange: [number, number];
  zoom: number;
}

const props = defineProps<SignalMonitorsProps>();

function formatRange(range: [number, number]): string {
  return `${range[0].toFixed(2)}..${range[1].toFixed(2)}`;
}
</script>
