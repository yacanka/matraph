import { abs, compile, complex, isComplex } from 'mathjs';
import type { Complex } from 'mathjs';
import type { GraphConfig, GraphPoint } from '../types/graph';

const MAX_EXPRESSION_LENGTH = 500;
const MIN_SAMPLES = 16;
const MAX_SAMPLES = 4096;
const COMPLEX_EPSILON = 1e-8;
const DEFAULT_CONFIG: GraphConfig = {
  sampleCount: 256,
  domainStart: -10,
  domainEnd: 10,
};
type CompiledExpression = { evaluate: (scope: { z: Complex }) => unknown };

/** Normalize user input into mathjs-compatible syntax. */
export function normalizeExpression(rawExpression: string): string {
  const withSymbols = replaceCalculatorSymbols(rawExpression.trim());
  return expandSummation(convertAbsoluteBars(withSymbols));
}

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
  const normalizedExpression = normalizeExpression(expression);
  validateExpression(normalizedExpression);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  validateGraphConfig(finalConfig);
  const compiled = compile(normalizedExpression) as CompiledExpression;
  return rejectEmptyGraph(buildGraphPoints(compiled, finalConfig));
}

/** Convert graph points to normalized audio frequencies. */
export function mapToFrequencies(points: GraphPoint[]): number[] {
  const values = finiteYValues(points).map((value) => Math.abs(value));
  if (values.length === 0) return [];
  const maxValue = Math.max(...values, 1);
  return values.map((value) => 220 + (value / maxValue) * 660);
}

function replaceCalculatorSymbols(expression: string): string {
  return expression
    .replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
    .replaceAll('π', 'pi').replaceAll('{', '(').replaceAll('}', ')')
    .replaceAll('[', '(').replaceAll(']', ')').replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([\w.]+)/g, 'sqrt($1)').replace(/∑\s*\(/g, 'sumN(');
}

function buildGraphPoints(compiled: CompiledExpression, config: GraphConfig): GraphPoint[] {
  const interval = config.domainEnd - config.domainStart;
  return Array.from({ length: config.sampleCount }, (_, index) => {
    const xValue = config.domainStart + (interval * index) / (config.sampleCount - 1);
    const result = compiled.evaluate({ z: complex(xValue, 0) });
    return { x: xValue, y: toGraphValue(result) };
  });
}

function toGraphValue(value: unknown): number | null {
  if (typeof value === 'number') return toFiniteNumber(value);
  if (isComplex(value)) return complexToGraphValue(value);
  return null;
}

function complexToGraphValue(value: Complex): number | null {
  const graphValue = Math.abs(value.im) < COMPLEX_EPSILON ? value.re : abs(value);
  return toFiniteNumber(Number(graphValue));
}

function toFiniteNumber(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function rejectEmptyGraph(points: GraphPoint[]): GraphPoint[] {
  if (finiteYValues(points).length > 0) return points;
  throw new Error('Expression did not produce finite graph values.');
}

function finiteYValues(points: GraphPoint[]): number[] {
  return points.flatMap((point) => point.y === null || !Number.isFinite(point.y) ? [] : [point.y]);
}

function convertAbsoluteBars(expression: string): string {
  const parts = expression.split('|');
  if (parts.length === 1) return expression;
  if (parts.length % 2 === 0) throw new Error('Unbalanced absolute value bars.');
  return parts.map((part, index) => mapAbsolutePart(part, index, parts.length)).join('');
}

function mapAbsolutePart(part: string, index: number, totalParts: number): string {
  if (index === 0 || index === totalParts - 1) return part;
  return index % 2 === 1 ? `abs(${part})` : part;
}

function expandSummation(expression: string): string {
  const startIndex = expression.indexOf('sumN(');
  if (startIndex === -1) return expression;
  const openIndex = startIndex + 'sumN'.length;
  const closeIndex = findMatchingClose(expression, openIndex);
  const args = splitTopLevelArgs(expression.slice(openIndex + 1, closeIndex));
  const expanded = expandSummationArgs(args);
  const nextExpression = `${expression.slice(0, startIndex)}${expanded}${expression.slice(closeIndex + 1)}`;
  return expandSummation(nextExpression);
}

function expandSummationArgs(args: string[]): string {
  if (args.length !== 3) throw new Error('sumN requires arguments: sumN(start,end,expression).');
  const start = Number(args[0].trim());
  const end = Number(args[1].trim());
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) throw new Error('sumN requires integer range: sumN(start,end,expression).');
  return `(${buildSummationTerms(args[2].trim(), start, end)})`;
}

function buildSummationTerms(term: string, start: number, end: number): string {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const currentValue = String(start + index);
    return `(${term.replace(/\bn\b/g, currentValue)})`;
  }).join(' + ');
}

function findMatchingClose(expression: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < expression.length; index += 1) {
    if (expression[index] === '(') depth += 1;
    if (expression[index] === ')') depth -= 1;
    if (depth === 0) return index;
  }
  throw new Error('Unbalanced sumN parentheses.');
}

function splitTopLevelArgs(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '(') depth += 1;
    if (args[index] === ')') depth -= 1;
    if (args[index] === ',' && depth === 0) {
      parts.push(args.slice(start, index));
      start = index + 1;
    }
  }
  return [...parts, args.slice(start)];
}
