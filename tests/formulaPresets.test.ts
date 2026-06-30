import { describe, expect, it } from 'vitest';
import { generateGraph } from '../src/services/expressionEngine';
import {
  findFormulaPreset,
  FORMULA_PRESETS,
  getDefaultFormulaPreset,
  getFormulaCategories,
} from '../src/services/formulaPresets';

describe('formulaPresets', () => {
  it('uses the first preset as default', () => {
    expect(getDefaultFormulaPreset()).toBe(FORMULA_PRESETS[0]);
  });

  it('finds presets by stable id', () => {
    expect(findFormulaPreset('square')?.label).toBe('Square');
    expect(findFormulaPreset('missing')).toBeUndefined();
  });

  it('groups presets into display categories', () => {
    const categories = getFormulaCategories();

    expect(categories).toContain('geometry');
    expect(FORMULA_PRESETS.length).toBeGreaterThan(10);
    expect(FORMULA_PRESETS.every((preset) => categories.includes(preset.category))).toBe(true);
  });

  it('keeps every preset renderable by the expression engine', () => {
    FORMULA_PRESETS.forEach((preset) => {
      const points = generateGraph(preset.expression, {
        sampleCount: 32,
        domainStart: preset.domainStart,
        domainEnd: preset.domainEnd,
      });

      expect(points.some((point) => point.y !== null)).toBe(true);
    });
  });
});
