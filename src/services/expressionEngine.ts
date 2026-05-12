import { Complex, abs, compile, complex } from 'mathjs';
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

/** Normalize user input into mathjs-compatible syntax. */
export function normalizeExpression(rawExpression: string): string {
  const trimmed = rawExpression.trim();
  const withSymbols = trimmed
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

/** Build plot points by evaluating expression on the selected domain. */
export function generateGraph(expression: string, config?: Partial<GraphConfig>): GraphPoint[] {
  const normalizedExpression = normalizeExpression(expression);
  validateExpression(normalizedExpression);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  validateGraphConfig(finalConfig);
  return buildGraphPoints(compile(normalizedExpression), finalConfig);
}

/** Convert graph points to normalized audio frequencies. */
export function mapToFrequencies(points: GraphPoint[]): number[] {
  const values = points.map((point) => Math.abs(point.y));
  const maxValue = Math.max(...values, 1);
  return values.map((value) => 220 + (value / maxValue) * 660);
}

function buildGraphPoints(compiled: ReturnType<typeof compile>, config: GraphConfig): GraphPoint[] {
  const interval = config.domainEnd - config.domainStart;
  return Array.from({ length: config.sampleCount }, (_, index) => {
    const xValue = config.domainStart + (interval * index) / (config.sampleCount - 1);
    const result = compiled.evaluate({ z: complex(xValue, 0) }) as Complex;
    return { x: xValue, y: toGraphValue(result) };
  });
}

function toGraphValue(value: Complex): number {
  return Math.abs(value.im) < COMPLEX_EPSILON ? value.re : abs(value);
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
  const firstIndex = expression.indexOf('sumN(');
  if (firstIndex < 0) return expression;
  const parsed = parseSummationAt(expression, firstIndex);
  const expandedTerm = expandSummation(parsed.term);
  const terms = createSummationTerms(parsed.start, parsed.end, expandedTerm);
  const expanded = `(${terms.join(' + ')})`;
  return expression.slice(0, firstIndex) + expanded + expandSummation(expression.slice(parsed.nextIndex));
}

function parseSummationAt(expression: string, startIndex: number): ParsedSummation {
  const innerText = readEnclosedText(expression, startIndex + 4);
  const args = splitTopLevelArgs(innerText.content);
  if (args.length !== 3) throw new Error('sumN requires format: sumN(start,end,expression).');
  const start = Number(args[0].trim());
  const end = Number(args[1].trim());
  validateSummationBounds(start, end);
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

function createSummationTerms(start: number, end: number, term: string): string[] {
  return Array.from({ length: end - start + 1 }, (_, offset) => {
    const termValue = start + offset;
    return `(${replaceSummationVariable(term, termValue)})`;
  });
}

function replaceSummationVariable(term: string, termValue: number): string {
  return term.replace(/\bn\b/g, String(termValue));
}

function validateSummationBounds(start: number, end: number): void {
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
    throw new Error('sumN requires integer range: sumN(start,end,expression).');
  }
}

type ReadResult = {
  content: string;
  nextIndex: number;
};

type ParsedSummation = {
  start: number;
  end: number;
  term: string;
  nextIndex: number;
};
