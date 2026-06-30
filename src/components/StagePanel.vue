<template>
  <section class="stage-panel" :class="`mode-${props.stageMode}`" aria-label="Function drawing">
    <header class="stage-header">
      <div>
        <p class="eyebrow">Active Series</p>
        <h2>{{ props.activeLabel }}</h2>
      </div>
      <span class="sample-pill">{{ props.sampleCount }} samples</span>
    </header>

    <svg :viewBox="`0 0 ${props.width} ${props.height}`" class="chart" role="img" aria-label="Function graph">
      <defs>
        <pattern id="grid-lines" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" class="grid-line" />
        </pattern>
        <filter id="orange-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="#ff6a1a" flood-opacity="0.72" />
        </filter>
      </defs>

      <rect :width="props.width" :height="props.height" class="chart-bg" />
      <rect :width="props.width" :height="props.height" fill="url(#grid-lines)" class="grid-plane" />
      <line x1="0" :y1="props.centerY" :x2="props.width" :y2="props.centerY" class="axis-line" />
      <line x1="0" :y1="props.baselineY" :x2="props.width" :y2="props.baselineY" class="dash-line" />
      <path v-if="props.stageMode === 'standard'" :d="props.plotPath" class="graph-path" filter="url(#orange-glow)" />

      <g v-if="props.isAnimating" class="fourier-layer">
        <circle
          v-for="(arm, index) in props.arms"
          :key="`circle-${index}`"
          :cx="arm.start.x"
          :cy="arm.start.y"
          :r="arm.radius"
          class="fourier-circle"
        />
        <line
          v-for="(arm, index) in props.arms"
          :key="`arm-${index}`"
          :x1="arm.start.x"
          :y1="arm.start.y"
          :x2="arm.end.x"
          :y2="arm.end.y"
          class="fourier-arm"
        />
        <line
          v-if="props.stageMode === 'reel' && props.trace.length > 0"
          :x1="lastArmTip.x"
          :y1="lastTracePoint.y"
          :x2="lastTracePoint.x"
          :y2="lastTracePoint.y"
          class="reel-connector"
        />
        <path :d="tracePath" class="fourier-trace" filter="url(#orange-glow)" />
      </g>
    </svg>

    <p class="formula-readout">f(z) = {{ props.expression }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FourierArm } from '../services/fourierEngine';
import type { StageMode } from '../services/stageLayout';
import type { CoordinatePoint } from '../types/graph';

interface StagePanelProps {
  activeLabel: string;
  arms: FourierArm[];
  baselineY: number;
  centerY: number;
  expression: string;
  height: number;
  isAnimating: boolean;
  plotPath: string;
  sampleCount: number;
  stageMode: StageMode;
  trace: CoordinatePoint[];
  width: number;
}

const props = defineProps<StagePanelProps>();
const tracePath = computed(() => toSvgPath(props.trace));
const lastTracePoint = computed(() => props.trace.at(-1) ?? { x: 0, y: 0 });
const lastArmTip = computed(() => props.arms.at(-1)?.end ?? { x: 0, y: 0 });

function toSvgPath(sourcePoints: CoordinatePoint[]): string {
  return sourcePoints.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join(' ');
}
</script>
