export type FormulaCategory = 'fourier' | 'signal' | 'geometry' | 'experimental';

export interface FormulaPreset {
  id: string;
  label: string;
  category: FormulaCategory;
  expression: string;
  sampleCount: number;
  domainStart: number;
  domainEnd: number;
  vectorCount: number;
}

const SIX_PI = 18.8496;
const FOUR_PI = 12.5664;
const LONG_DOMAIN = 30;
const SAWTOOTH_EXPRESSION = '(2 / pi) * ∑(1,10,((-1)^(n + 1) / n) * sin(n * z))';
const SQUARE_EXPRESSION = '(4 / pi) * ∑(1,10,(1 / (2 * n - 1)) * sin((2 * n - 1) * z))';
const TRIANGLE_EXPRESSION = '(8 / (pi^2)) * ∑(1,5,(((-1)^(n - 1)) / ((2 * n - 1)^2)) * sin((2 * n - 1) * z))';
const HYPOTROCHOID_EXPRESSION = '[(5 - 3) * cos(z) + 3 * cos(((5 - 3) / 3) * z), (5 - 3) * sin(z) - 3 * sin(((5 - 3) / 3) * z)]';

export const FORMULA_PRESETS: readonly FormulaPreset[] = [
  createPreset('sawtooth', 'Sawtooth', 'fourier', SAWTOOTH_EXPRESSION, 0, SIX_PI),
  createPreset('square', 'Square', 'fourier', SQUARE_EXPRESSION, 0, SIX_PI),
  createPreset('abs-sawtooth', 'Abs Sawtooth', 'fourier', `abs(${SAWTOOTH_EXPRESSION})`, 0, SIX_PI),
  createPreset('triangle', 'Triangle', 'fourier', TRIANGLE_EXPRESSION, 0, SIX_PI),
  createPreset('am-carrier', 'AM Carrier', 'signal', '(1 + 0.4 * sin(0.5 * z)) * sin(8 * z)', 0, SIX_PI),
  createPreset('chirp', 'Chirp Sweep', 'signal', 'sin((z^2) / 4)', 0, LONG_DOMAIN),
  createPreset('damped', 'Damped Sine', 'signal', 'exp(-0.08 * z) * sin(4 * z)', 0, LONG_DOMAIN),
  createPreset('pulse', 'Pulse Stack', 'signal', 'sin(z) + (1 / 3) * sin(3 * z) + (1 / 5) * sin(5 * z)', 0, SIX_PI),
  createPreset('lissajous-slice', 'Lissajous Slice', 'geometry', 'sin(3 * z + pi / 4) + 0.35 * sin(2 * z)', 0, SIX_PI),
  createPreset('lissajous-2d', 'Lissajous 2D', 'geometry', '[sin(3 * t + pi / 4), sin(2 * t)]', 0, SIX_PI),
  createPreset('butterfly', 'Butterfly Ripple', 'geometry', 'sin(z) * (exp(cos(z)) - 2 * cos(4 * z) - (sin(z / 12))^5)', 0, FOUR_PI),
  createPreset('cardioid', 'Cardioid Wave', 'geometry', '(1 - sin(z)) * sin(z)', 0, SIX_PI),
  createPreset('cardioid-2d', 'Cardioid 2D', 'geometry', '[(1 - sin(z)) * cos(z), (1 - sin(z)) * sin(z)]', 0, SIX_PI),
  createPreset('rose', 'Rose Wave', 'geometry', 'sin(5 * z) * sin(z)', 0, FOUR_PI),
  createPreset('rose-2d', 'Rose 2D', 'geometry', '[sin(5 * z) * cos(z), sin(5 * z) * sin(z)]', 0, FOUR_PI),
  createPreset('chaotic', 'Chaotic Signal', 'experimental', 'sin(z * sin(3 * z)) + 0.4 * cos(7 * z)', 0, LONG_DOMAIN),
  createPreset('radar', 'Retro Radar', 'experimental', 'abs(sin(4 * z)) * cos(z)', 0, SIX_PI),
  createPreset('hypotrochoid-2d', 'Hypotrochoid 2D', 'experimental', HYPOTROCHOID_EXPRESSION, 0, SIX_PI),
  createPreset('systolic', 'Systolic Rhythm', 'experimental', 'sin(z) + 0.45 * sin(2 * z)^3 - 0.2 * cos(9 * z)', 0, SIX_PI),
];

/** Return the preset shown when the app first opens. */
export function getDefaultFormulaPreset(): FormulaPreset {
  return FORMULA_PRESETS[0];
}

/** Find a preset by id for UI labels and selection state. */
export function findFormulaPreset(presetId: string): FormulaPreset | undefined {
  return FORMULA_PRESETS.find((preset) => preset.id === presetId);
}

/** Return preset categories in display order. */
export function getFormulaCategories(): FormulaCategory[] {
  return ['fourier', 'signal', 'geometry', 'experimental'];
}

function createPreset(
  id: string,
  label: string,
  category: FormulaCategory,
  expression: string,
  domainStart: number,
  domainEnd: number,
): FormulaPreset {
  return { id, label, category, expression, sampleCount: 768, domainStart, domainEnd, vectorCount: 72 };
}
