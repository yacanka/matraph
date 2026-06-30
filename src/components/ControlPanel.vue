<template>
  <section class="control-panel">
    <label class="expression-field" for="expression">
      <span>Expression</span>
      <textarea
        id="expression"
        ref="expressionField"
        v-model="expression"
        rows="4"
        placeholder="Example: sin(z) or [sin(3*t), sin(2*t)]"
        @input="markCustom"
      />
    </label>

    <div class="token-grid">
      <button v-for="token in quickTokens" :key="token" class="chip" type="button" @click="insertToken(token)">
        {{ token }}
      </button>
    </div>

    <div class="parameter-grid">
      <label>Samples<input v-model.number="sampleCount" type="number" min="16" max="4096" step="1" /></label>
      <label>Domain Start<input v-model.number="domainStart" type="number" step="0.5" /></label>
      <label>Domain End<input v-model.number="domainEnd" type="number" step="0.5" /></label>
      <label>Vectors<input v-model.number="fourierVectorCount" type="number" min="1" max="128" step="1" /></label>
      <label>Speed<input v-model.number="fourierSpeed" type="number" min="0.25" max="4" step="0.25" /></label>
      <label>Zoom<input v-model.number="graphZoom" type="range" min="0.5" max="3" step="0.1" /></label>
      <label>Reference Hz<input v-model.number="referenceFrequency" type="range" min="110" max="880" step="1" /></label>
    </div>

    <div class="mode-row" aria-label="Stage mode">
      <button
        v-for="option in modeOptions"
        :key="option.value"
        class="mode-button"
        :class="{ selected: option.value === props.stageMode }"
        type="button"
        @click="emit('modeChange', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="mode-row" aria-label="Audio scale">
      <button
        v-for="option in scaleOptions"
        :key="option.value"
        class="mode-button"
        :class="{ selected: option.value === audioScale }"
        type="button"
        @click="audioScale = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="actions">
      <button type="button" @click="emit('render')">Render</button>
      <button type="button" :disabled="!props.hasPoints" @click="emit('audio')">Audio</button>
      <button type="button" :disabled="!props.canAnimate" @click="emit('animate')">Animate</button>
      <button type="button" :disabled="!props.isAnimating" @click="emit('stop')">Stop</button>
    </div>

    <p v-if="props.errorMessage" class="error">{{ props.errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import type { AudioScale } from '../services/animationTrace';
import type { StageMode } from '../services/stageLayout';

interface ControlPanelProps {
  canAnimate: boolean;
  errorMessage: string;
  hasPoints: boolean;
  isAnimating: boolean;
  stageMode: StageMode;
}

const props = defineProps<ControlPanelProps>();
const emit = defineEmits<{
  animate: [];
  audio: [];
  customExpression: [];
  modeChange: [mode: StageMode];
  render: [];
  stop: [];
}>();
const expression = defineModel<string>('expression', { required: true });
const sampleCount = defineModel<number>('sampleCount', { required: true });
const domainStart = defineModel<number>('domainStart', { required: true });
const domainEnd = defineModel<number>('domainEnd', { required: true });
const fourierVectorCount = defineModel<number>('fourierVectorCount', { required: true });
const fourierSpeed = defineModel<number>('fourierSpeed', { required: true });
const graphZoom = defineModel<number>('graphZoom', { required: true });
const referenceFrequency = defineModel<number>('referenceFrequency', { required: true });
const audioScale = defineModel<AudioScale>('audioScale', { required: true });
const expressionField = ref<HTMLTextAreaElement | null>(null);
const quickTokens = ['sin()', 'cos()', 'tan()', 'sqrt()', '√()', 'log()', 'abs()', '|z|', '[x,y]', '∑(1,5,n)', 'π', '^', '×', '÷', '( )'];
const modeOptions: Array<{ label: string; value: StageMode }> = [
  { label: 'Graph', value: 'standard' },
  { label: 'Reel', value: 'reel' },
];
const scaleOptions: Array<{ label: string; value: AudioScale }> = [
  { label: 'Free', value: 'free' },
  { label: 'Chromatic', value: 'chromatic' },
  { label: 'Major', value: 'major' },
  { label: 'Harmonic', value: 'harmonic-minor' },
];

function insertToken(token: string): void {
  const field = expressionField.value;
  if (!field) return;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const snippet = token === '( )' ? '()' : token.replace('[x,y]', '[sin(t), cos(t)]');
  expression.value = `${expression.value.slice(0, start)}${snippet}${expression.value.slice(end)}`;
  markCustom();
  nextTick(() => placeCursor(field, token, snippet, start));
}

function markCustom(): void {
  emit('customExpression');
}

function placeCursor(field: HTMLTextAreaElement, token: string, snippet: string, start: number): void {
  field.focus();
  const cursor = token.endsWith('()') || token === '( )' ? start + snippet.length - 1 : start + snippet.length;
  field.setSelectionRange(cursor, cursor);
}
</script>
