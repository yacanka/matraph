/** Normalize user input into mathjs-compatible syntax. */
export function normalizeExpression(rawExpression: string): string {
  const withSymbols = replaceCalculatorSymbols(rawExpression.trim());
  return expandSummation(convertAbsoluteBars(withSymbols));
}

function replaceCalculatorSymbols(expression: string): string {
  return expression
    .replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
    .replaceAll('π', 'pi').replaceAll('{', '(').replaceAll('}', ')')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([\w.]+)/g, 'sqrt($1)').replace(/∑\s*\(/g, 'sumN(');
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
  const nextExpression = replaceSummation(expression, startIndex, closeIndex, args);
  return expandSummation(nextExpression);
}

function replaceSummation(expression: string, startIndex: number, closeIndex: number, args: string[]): string {
  const expanded = expandSummationArgs(args);
  return `${expression.slice(0, startIndex)}${expanded}${expression.slice(closeIndex + 1)}`;
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
