<template>
  <div class="preset-library">
    <div class="preset-categories" aria-label="Preset categories">
      <button
        v-for="category in categories"
        :key="category"
        class="preset-category"
        :class="{ selected: category === props.activeCategory }"
        type="button"
        @click="emit('categoryChange', category)"
      >
        {{ categoryLabels[category] }}
      </button>
    </div>

    <div class="preset-options" aria-label="Formula presets">
      <button
        v-for="preset in visiblePresets"
        :key="preset.id"
        class="preset-button"
        :class="{ selected: preset.id === props.activePresetId }"
        type="button"
        @click="emit('presetSelect', preset)"
      >
        {{ preset.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getFormulaCategories } from '../services/formulaPresets';
import type { FormulaCategory, FormulaPreset } from '../services/formulaPresets';

interface PresetLibraryProps {
  activeCategory: FormulaCategory;
  activePresetId: string;
  presets: readonly FormulaPreset[];
}

const props = defineProps<PresetLibraryProps>();
const emit = defineEmits<{
  categoryChange: [category: FormulaCategory];
  presetSelect: [preset: FormulaPreset];
}>();
const categories = getFormulaCategories();
const categoryLabels: Record<FormulaCategory, string> = {
  fourier: 'Fourier',
  signal: 'Signals',
  geometry: 'Shapes',
  experimental: 'Lab',
};
const visiblePresets = computed(() => {
  return props.presets.filter((preset) => preset.category === props.activeCategory);
});
</script>
