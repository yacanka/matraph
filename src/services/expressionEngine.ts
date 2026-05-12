import { Complex, abs, compile, complex } from 'mathjs';
import type { GraphConfig, GraphPoint } from '../types/graph';

const MAX_EXPRESSION_LENGTH = 500;
const MIN_SAMPLES = 16;
const MAX_SAMPLES = 4096;
const COMPLEX_EPSILON = 1e-8;
const DEFAULT_CONFIG: GraphConfig = { sampleCount: 256, domainStart: -10, domainEnd: 10 };

/** Normalize user input into mathjs-compatible syntax. */
export function normalizeExpression(rawExpression: string): string {
  const trimmed = rawExpression.trim();
  const withTrigPowers = normalizeTrigPowerSyntax(trimmed);
  const withSymbols = withTrigPowers
    .replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
    .replaceAll('π', 'pi').replaceAll('{', '(').replaceAll('}', ')')
    .replaceAll('[', '(').replaceAll(']', ')').replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([\w.]+)/g, 'sqrt($1)').replace(/∑\s*\(/g, 'sumN(');
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

/** Build plot points by evaluating y=f(z) on the selected domain. */
export function generateGraph(expression: string, config?: Partial<GraphConfig>): GraphPoint[] {
  const normalizedExpression = normalizeExpression(expression);
  validateExpression(normalizedExpression);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  validateGraphConfig(finalConfig);
  return buildGraphPoints(compile(normalizedExpression) as CompiledExpression, finalConfig);
}

/** Build plot points by evaluating parametric x(t), y(t) on the selected domain. */
export function generateParametricGraph(xExpression: string, yExpression: string, config?: Partial<GraphConfig>): GraphPoint[] {
  const normalizedX = normalizeExpression(xExpression);
  const normalizedY = normalizeExpression(yExpression);
  validateExpression(normalizedX);
  validateExpression(normalizedY);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  validateGraphConfig(finalConfig);
  return buildParametricPoints(compile(normalizedX) as CompiledExpression, compile(normalizedY) as CompiledExpression, finalConfig);
}

/** Convert graph points to normalized audio frequencies. */
export function mapToFrequencies(points: GraphPoint[]): number[] {
  const values = points.map((point) => Math.abs(point.y));
  const maxValue = Math.max(...values, 1);
  return values.map((value) => 220 + (value / maxValue) * 660);
}

function buildGraphPoints(compiled: CompiledExpression, config: GraphConfig): GraphPoint[] {
  return createSamples(config).map((sample) => ({ x: sample, y: toGraphValue(compiled.evaluate({ z: complex(sample, 0) }) as Complex) }));
}

function buildParametricPoints(compiledX: CompiledExpression, compiledY: CompiledExpression, config: GraphConfig): GraphPoint[] {
  return createSamples(config).map((sample) => {
    const scope = { t: complex(sample, 0), z: complex(sample, 0) };
    return { x: toGraphValue(compiledX.evaluate(scope) as Complex), y: toGraphValue(compiledY.evaluate(scope) as Complex) };
  });
}

function createSamples(config: GraphConfig): number[] {
  const interval = config.domainEnd - config.domainStart;
  return Array.from({ length: config.sampleCount }, (_, index) => config.domainStart + (interval * index) / (config.sampleCount - 1));
}

function toGraphValue(value: number | Complex): number {
  if (typeof value === 'number') return value;
  return Math.abs(value.im) < COMPLEX_EPSILON ? value.re : abs(value);
}


function normalizeTrigPowerSyntax(expression: string): string {
  const withExplicitArg = expression.replace(/\b(sin|cos|tan)\s*\^\s*(\d+)\s*\(([^()]+)\)/gi, '($1($3))^$2');
  return withExplicitArg.replace(/\b(sin|cos|tan)\s*\^\s*(\d+)\b/gi, '($1(z))^$2');
}

function convertAbsoluteBars(expression: string): string {
  const parts = expression.split('|');
  if (parts.length === 1) return expression;
  if (parts.length % 2 === 0) throw new Error('Unbalanced absolute value bars.');
  return parts.map((part, index) => (index === 0 || index === parts.length - 1 ? part : index % 2 === 1 ? `abs(${part})` : part)).join('');
}

function expandSummation(expression: string): string {
  const firstIndex = expression.indexOf('sumN(');
  if (firstIndex < 0) return expression;
  const parsed = parseSummationAt(expression, firstIndex);
  const expandedTerm = expandSummation(parsed.term);
  const expanded = `(${Array.from({ length: parsed.end - parsed.start + 1 }, (_, i) => `(${expandedTerm.replace(/\bn\b/g, String(parsed.start + i))})`).join(' + ')})`;
  return expression.slice(0, firstIndex) + expanded + expandSummation(expression.slice(parsed.nextIndex));
}

function parseSummationAt(expression: string, startIndex: number): ParsedSummation {
  const innerText = readEnclosedText(expression, startIndex + 4);
  const args = splitTopLevelArgs(innerText.content);
  const start = Number(args[0]?.trim());
  const end = Number(args[1]?.trim());
  if (args.length !== 3 || !Number.isInteger(start) || !Number.isInteger(end) || end < start) throw new Error('sumN requires integer range: sumN(start,end,expression).');
  return { start, end, term: args[2].trim(), nextIndex: innerText.nextIndex };
}

function readEnclosedText(expression: string, openParenIndex: number): ReadResult {
  if (expression[openParenIndex] !== '(') throw new Error('sumN requires format: sumN(start,end,expression).');
  let depth = 1;
  for (let index = openParenIndex + 1; index < expression.length; index += 1) {
    if (expression[index] === '(') depth += 1;
    if (expression[index] === ')') depth -= 1;
    if (depth === 0) return { content: expression.slice(openParenIndex + 1, index), nextIndex: index + 1 };
  }
  throw new Error('sumN has unbalanced parentheses.');
}

function splitTopLevelArgs(content: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let partStart = 0;
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '(') depth += 1;
    else if (content[index] === ')') depth -= 1;
    else if (content[index] === ',' && depth === 0) {
      args.push(content.slice(partStart, index));
      partStart = index + 1;
    }
  }
  args.push(content.slice(partStart));
  return args;
}

type ReadResult = { content: string; nextIndex: number };
type ParsedSummation = { start: number; end: number; term: string; nextIndex: number };


type CompiledExpression = { evaluate(scope: Record<string, Complex>): number | Complex };
