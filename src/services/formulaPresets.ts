export interface FormulaPreset {
  id: string;
  label: string;
  expression: string;
  sampleCount: number;
  domainStart: number;
  domainEnd: number;
  vectorCount: number;
}

const SIX_PI = 18.8496;
const SAWTOOTH_EXPRESSION = '(2 / pi) * ∑(1,10,((-1)^(n + 1) / n) * sin(n * z))';
const SQUARE_EXPRESSION = '(4 / pi) * ∑(1,10,(1 / (2 * n - 1)) * sin((2 * n - 1) * z))';

export const FORMULA_PRESETS: readonly FormulaPreset[] = [
  {
    id: 'sawtooth',
    label: 'Sawtooth',
    expression: SAWTOOTH_EXPRESSION,
    sampleCount: 768,
    domainStart: 0,
    domainEnd: SIX_PI,
    vectorCount: 72,
  },
  {
    id: 'square',
    label: 'Square',
    expression: SQUARE_EXPRESSION,
    sampleCount: 768,
    domainStart: 0,
    domainEnd: SIX_PI,
    vectorCount: 72,
  },
  {
    id: 'abs-sawtooth',
    label: 'Abs Sawtooth',
    expression: `abs(${SAWTOOTH_EXPRESSION})`,
    sampleCount: 768,
    domainStart: 0,
    domainEnd: SIX_PI,
    vectorCount: 72,
  },
];

/** Return the preset shown when the app first opens. */
export function getDefaultFormulaPreset(): FormulaPreset {
  return FORMULA_PRESETS[0];
}

/** Find a preset by id for UI labels and selection state. */
export function findFormulaPreset(presetId: string): FormulaPreset | undefined {
  return FORMULA_PRESETS.find((preset) => preset.id === presetId);
}
