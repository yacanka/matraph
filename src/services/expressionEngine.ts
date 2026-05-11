import { Complex, abs, compile, complex } from 'mathjs';
import type { GraphConfig, GraphPoint } from '../types/graph';

const MAX_EXPRESSION_LENGTH = 500;
const MIN_SAMPLES = 16;
const MAX_SAMPLES = 4096;
const DEFAULT_CONFIG: GraphConfig = {
  sampleCount: 256,
  domainStart: -10,
  domainEnd: 10,
};

/** Normalize user input into mathjs-compatible syntax. */
export function normalizeExpression(rawExpression: string): string {
  const trimmed = rawExpression.trim();
  const withSymbols = trimmed
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-')
    .replaceAll('π', 'pi')
    .replaceAll('{', '(')
    .replaceAll('}', ')')
    .replaceAll('[', '(')
    .replaceAll(']', ')')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([\w.]+)/g, 'sqrt($1)')
    .replace(/∑\s*\(/g, 'sumN(');
  const withAbs = convertAbsoluteBars(withSymbols);
  return expandSummation(withAbs);
}

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
  if (!Number.isInteger(config.sampleCount)) throw new Error('Sample count must be an integer.');
  if (config.sampleCount < MIN_SAMPLES || config.sampleCount > MAX_SAMPLES) {
    throw new Error(`Sample count must be between ${MIN_SAMPLES} and ${MAX_SAMPLES}.`);
  }
  if (!Number.isFinite(config.domainStart) || !Number.isFinite(config.domainEnd)) {
    throw new Error('Domain values must be finite numbers.');
  }
  if (config.domainStart >= config.domainEnd) throw new Error('Domain start must be smaller than domain end.');
}

/** Build plot points by evaluating expression on the selected domain. */
export function generateGraph(expression: string, config?: Partial<GraphConfig>): GraphPoint[] {
  const normalizedExpression = normalizeExpression(expression);
  validateExpression(normalizedExpression);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  validateGraphConfig(finalConfig);
  const compiled = compile(normalizedExpression);
  return buildGraphPoints(compiled, finalConfig);
}

/** Convert graph points to normalized audio frequencies. */
export function mapToFrequencies(points: GraphPoint[]): number[] {
  const values = points.map((point) => point.y);
  const maxValue = Math.max(...values, 1);
  return values.map((value) => 220 + (value / maxValue) * 660);
}

function buildGraphPoints(compiled: ReturnType<typeof compile>, config: GraphConfig): GraphPoint[] {
  const interval = config.domainEnd - config.domainStart;
  return Array.from({ length: config.sampleCount }, (_, index) => {
    const ratio = index / (config.sampleCount - 1);
    const xValue = config.domainStart + interval * ratio;
    const result = compiled.evaluate({ z: complex(xValue, 0) }) as Complex;
    return { x: xValue, y: abs(result) };
  });
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
  const sumPattern = /sumN\(([^,]+),([^,]+),(.+?)\)/;
  const match = expression.match(sumPattern);
  if (!match) return expression;
  const start = Number(match[1].trim());
  const end = Number(match[2].trim());
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
    throw new Error('sumN requires integer range: sumN(start,end,expression).');
  }
  const term = match[3].trim();
  const expanded = Array.from({ length: end - start + 1 }, (_, i) => `(${term.replaceAll('n', String(start + i))})`).join(' + ');
  return expression.replace(sumPattern, `(${expanded})`);
}
