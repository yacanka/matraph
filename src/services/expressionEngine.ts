import { Complex, abs, compile, complex } from 'mathjs';
import type { GraphPoint } from '../types/graph';

const MAX_EXPRESSION_LENGTH = 180;

/** Validate expression and reject unsafe patterns. */
export function validateExpression(expression: string): void {
  if (!expression.trim()) throw new Error('Expression cannot be empty.');
  if (expression.length > MAX_EXPRESSION_LENGTH) throw new Error('Expression is too long.');
  if (/\b(import|createUnit|evaluate|parse|Function)\b/i.test(expression)) {
    throw new Error('Expression contains forbidden tokens.');
  }
}

/** Build plot points by evaluating expression on x-axis. */
export function generateGraph(expression: string, samples = 256): GraphPoint[] {
  validateExpression(expression);
  const compiled = compile(expression);
  const points: GraphPoint[] = [];
  for (let index = 0; index < samples; index += 1) {
    const xValue = -10 + (index * 20) / (samples - 1);
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
