import { abs, compile, complex, isComplex } from 'mathjs';
import type { Complex } from 'mathjs';
import { normalizeExpression } from './expressionNormalizer';
import type { GraphConfig, GraphPoint, GraphRender, GraphSeries } from '../types/graph';

const MAX_EXPRESSION_LENGTH = 500;
const MIN_SAMPLES = 16;
const MAX_SAMPLES = 4096;
const COMPLEX_EPSILON = 1e-8;
const DEFAULT_CONFIG: GraphConfig = {
  sampleCount: 256,
  domainStart: -10,
  domainEnd: 10,
};
type CompiledExpression = { evaluate: (scope: { t: Complex; z: Complex }) => unknown };
type MatrixLike = { toArray: () => unknown };
interface EvaluationSample {
  domainX: number;
  values: unknown[];
  vector: boolean;
}

export { normalizeExpression };

/** Validate expression and reject unsafe patterns. */
export function validateExpression(expression: string): void {
  if (!expression.trim()) throw new Error('Expression cannot be empty.');
  if (expression.length > MAX_EXPRESSION_LENGTH) throw new Error('Expression is too long.');
  if (/\b(import|createUnit|evaluate|parse|Function)\b/i.test(expression)) throw new Error('Expression contains forbidden tokens.');
}

/** Validate graph configuration values. */
export function validateGraphConfig(config: GraphConfig): void {
  if (!Number.isInteger(config.sampleCount)) throw new Error('Sample count must be an integer.');
  if (config.sampleCount < MIN_SAMPLES || config.sampleCount > MAX_SAMPLES) throw new Error(`Sample count must be between ${MIN_SAMPLES} and ${MAX_SAMPLES}.`);
  if (!Number.isFinite(config.domainStart) || !Number.isFinite(config.domainEnd)) throw new Error('Domain values must be finite numbers.');
  if (config.domainStart >= config.domainEnd) throw new Error('Domain start must be smaller than domain end.');
}

/** Build plot points by evaluating expression on the selected domain. */
export function generateGraph(expression: string, config?: Partial<GraphConfig>): GraphPoint[] {
  return generateGraphRender(expression, config).points;
}

/** Build graph series by evaluating scalar, parametric, or vector expressions. */
export function generateGraphRender(expression: string, config?: Partial<GraphConfig>): GraphRender {
  const normalizedExpression = normalizeExpression(expression);
  validateExpression(normalizedExpression);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  validateGraphConfig(finalConfig);
  const compiled = compile(normalizedExpression) as CompiledExpression;
  return rejectEmptyRender(buildGraphRender(normalizedExpression, buildSamples(compiled, finalConfig)));
}

/** Convert graph points to normalized audio frequencies. */
export function mapToFrequencies(points: GraphPoint[]): number[] {
  const values = finiteYValues(points).map((value) => Math.abs(value));
  if (values.length === 0) return [];
  const maxValue = Math.max(...values, 1);
  return values.map((value) => 220 + (value / maxValue) * 660);
}

function buildSamples(compiled: CompiledExpression, config: GraphConfig): EvaluationSample[] {
  const interval = config.domainEnd - config.domainStart;
  return Array.from({ length: config.sampleCount }, (_, index) => {
    const xValue = config.domainStart + (interval * index) / (config.sampleCount - 1);
    const variableValue = complex(xValue, 0);
    const result = compiled.evaluate({ z: variableValue, t: variableValue });
    return { domainX: xValue, values: toValueList(result), vector: isVectorResult(result) };
  });
}

function buildGraphRender(expression: string, samples: EvaluationSample[]): GraphRender {
  const dimensions = resolveDimensions(samples);
  const series = buildSeries(samples, dimensions);
  return { dimensions, expression, points: series[0].points, primarySeries: series[0], series };
}

function toGraphValue(value: unknown): number | null {
  if (typeof value === 'number') return toFiniteNumber(value);
  if (isComplex(value)) return complexToGraphValue(value);
  return null;
}

function toValueList(value: unknown): unknown[] {
  return toVectorItems(value) ?? [value];
}

function isVectorResult(value: unknown): boolean {
  return toVectorItems(value) !== null;
}

function toVectorItems(value: unknown): unknown[] | null {
  const arrayValue = toArrayValue(value);
  if (!arrayValue) return null;
  if (arrayValue.length === 1 && Array.isArray(arrayValue[0])) return arrayValue[0] as unknown[];
  return arrayValue;
}

function toArrayValue(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (isMatrixLike(value)) {
    const arrayValue = value.toArray();
    return Array.isArray(arrayValue) ? arrayValue : null;
  }
  return null;
}

function isMatrixLike(value: unknown): value is MatrixLike {
  return typeof value === 'object' && value !== null && typeof (value as MatrixLike).toArray === 'function';
}

function complexToGraphValue(value: Complex): number | null {
  const graphValue = Math.abs(value.im) < COMPLEX_EPSILON ? value.re : abs(value);
  return toFiniteNumber(Number(graphValue));
}

function toFiniteNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function resolveDimensions(samples: EvaluationSample[]): number {
  const firstVector = samples.find((sample) => sample.vector);
  if (!firstVector) return 1;
  const dimensions = firstVector.values.length;
  if (dimensions < 1) throw new Error('Vector expressions must return at least one coordinate.');
  if (samples.some((sample) => sample.vector !== firstVector.vector || sample.values.length !== dimensions)) {
    throw new Error('Vector expression dimensions must stay consistent.');
  }
  return dimensions;
}

function buildSeries(samples: EvaluationSample[], dimensions: number): GraphSeries[] {
  if (dimensions === 2) return [buildParametricSeries(samples)];
  return Array.from({ length: dimensions }, (_, index) => buildScalarSeries(samples, index));
}

function buildParametricSeries(samples: EvaluationSample[]): GraphSeries {
  return {
    id: 'parametric-xy',
    kind: 'parametric',
    label: 'x,y',
    points: samples.map((sample) => toParametricPoint(sample)),
  };
}

function buildScalarSeries(samples: EvaluationSample[], dimensionIndex: number): GraphSeries {
  return {
    id: `scalar-${dimensionIndex}`,
    kind: 'scalar',
    label: dimensionIndex === 0 ? 'y' : `y${dimensionIndex + 1}`,
    points: samples.map((sample) => ({ x: sample.domainX, y: toGraphValue(sample.values[dimensionIndex]) })),
  };
}

function toParametricPoint(sample: EvaluationSample): GraphPoint {
  const xValue = toGraphValue(sample.values[0]);
  const yValue = toGraphValue(sample.values[1]);
  return { x: xValue ?? sample.domainX, y: yValue };
}

function rejectEmptyRender(render: GraphRender): GraphRender {
  if (render.series.some((series) => finiteYValues(series.points).length > 0)) return render;
  throw new Error('Expression did not produce finite graph values.');
}

function finiteYValues(points: GraphPoint[]): number[] {
  return points.flatMap((point) => point.y === null || !Number.isFinite(point.y) ? [] : [point.y]);
}
