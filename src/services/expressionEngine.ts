import { Complex, abs, compile, complex } from 'mathjs';
import type { GraphConfig, GraphPoint } from '../types/graph';

const MAX_EXPRESSION_LENGTH = 180;
const MIN_SAMPLES = 16;
const MAX_SAMPLES = 4096;
const DEFAULT_CONFIG: GraphConfig = {
  sampleCount: 256,
  domainStart: -10,
  domainEnd: 10,
};

/** Validate expression and reject unsafe patterns. */
export function validateExpression(expression: string): void {
  if (!expression.trim()) throw new Error('Expression cannot be empty.');
  if (expression.length > MAX_EXPRESSION_LENGTH) throw new Error('Expression is too long.');
  if (/\b(import|createUnit|evaluate|parse|Function)\b/i.test(expression)) {
    throw new Error('Expression contains forbidden tokens.');
  }
}

/** Validate graph configuration values. */
export function validateGraphConfig(config: GraphConfig): void {
  if (!Number.isInteger(config.sampleCount)) {
    throw new Error('Sample count must be an integer.');
  }
  if (config.sampleCount < MIN_SAMPLES || config.sampleCount > MAX_SAMPLES) {
    throw new Error(`Sample count must be between ${MIN_SAMPLES} and ${MAX_SAMPLES}.`);
  }
  if (!Number.isFinite(config.domainStart) || !Number.isFinite(config.domainEnd)) {
    throw new Error('Domain values must be finite numbers.');
  }
  if (config.domainStart >= config.domainEnd) {
    throw new Error('Domain start must be smaller than domain end.');
  }
}

/** Build plot points by evaluating expression on the selected domain. */
export function generateGraph(expression: string, config?: Partial<GraphConfig>): GraphPoint[] {
  validateExpression(expression);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  validateGraphConfig(finalConfig);
  const compiled = compile(expression);
  const points: GraphPoint[] = [];
  const interval = finalConfig.domainEnd - finalConfig.domainStart;
  for (let index = 0; index < finalConfig.sampleCount; index += 1) {
    const ratio = index / (finalConfig.sampleCount - 1);
    const xValue = finalConfig.domainStart + interval * ratio;
    const complexResult = compiled.evaluate({ z: complex(xValue, 0) }) as Complex;
    points.push({ x: xValue, y: abs(complexResult) });
  }
  return points;
}

/** Convert graph points to normalized audio frequencies. */
export function mapToFrequencies(points: GraphPoint[]): number[] {
  const values = points.map((point) => point.y);
  const maxValue = Math.max(...values, 1);
  return values.map((value) => 220 + (value / maxValue) * 660);
}
