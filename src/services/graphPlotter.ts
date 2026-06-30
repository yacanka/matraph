import type { CoordinatePoint, GraphPoint, GraphSeries } from '../types/graph';

export interface ChartView {
  width: number;
  height: number;
  padding: number;
  zoom: number;
}

export interface ProjectedGraphPoint extends CoordinatePoint {
  connected: boolean;
}

export interface GraphPlotPath {
  id: string;
  d: string;
  primary: boolean;
}

export interface GraphPlot {
  paths: GraphPlotPath[];
  path: string;
  projectedPoints: ProjectedGraphPoint[];
  yRange: [number, number];
}

const DEFAULT_VIEW: ChartView = { width: 800, height: 320, padding: 20, zoom: 1 };
const DISCONTINUITY_RATIO = 0.75;

/** Create a segmented SVG plot that avoids drawing across invalid samples. */
export function createGraphPlot(input: GraphPoint[] | GraphSeries[], viewConfig?: Partial<ChartView>): GraphPlot {
  const view = { ...DEFAULT_VIEW, ...viewConfig };
  const series = normalizeSeries(input);
  const allPoints = series.flatMap((entry) => entry.points);
  const yRange = applyYZoom(resolveYRange(allPoints), view.zoom);
  const xRange = resolveXRange(allPoints);
  const projectedSeries = series.map((entry) => projectSeries(entry, view, xRange, yRange));
  const paths = projectedSeries.map((entry, index) => ({ id: entry.id, d: createSvgPath(entry.points), primary: index === 0 }));
  return { path: paths[0]?.d ?? '', paths, projectedPoints: projectedSeries[0]?.points ?? [], yRange };
}

/** Return the longest continuous plotted segment centered around an origin. */
export function toCenteredLongestSegment(
  points: ProjectedGraphPoint[],
  origin: CoordinatePoint,
): CoordinatePoint[] {
  return toLongestSegment(points).map((point) => ({ x: point.x - origin.x, y: point.y - origin.y }));
}

/** Return the longest continuous plotted segment in screen coordinates. */
export function toLongestSegment(points: ProjectedGraphPoint[]): CoordinatePoint[] {
  const segments = splitSegments(points);
  return (segments.sort((left, right) => right.length - left.length)[0] ?? [])
    .map((point) => ({ x: point.x, y: point.y }));
}

function projectPoints(
  points: GraphPoint[],
  view: ChartView,
  xRange: [number, number],
  yRange: [number, number],
): ProjectedGraphPoint[] {
  return points.flatMap((point, index) => {
    if (point.y === null || !Number.isFinite(point.y)) return [];
    return [projectPoint(point, index, points, view, xRange, yRange)];
  });
}

function normalizeSeries(input: GraphPoint[] | GraphSeries[]): GraphSeries[] {
  if (input.length === 0) return [];
  if (isGraphSeries(input[0])) return input as GraphSeries[];
  return [{ id: 'primary', kind: 'scalar', label: 'y', points: input as GraphPoint[] }];
}

function isGraphSeries(value: GraphPoint | GraphSeries): value is GraphSeries {
  return 'points' in value;
}

function projectSeries(
  series: GraphSeries,
  view: ChartView,
  xRange: [number, number],
  yRange: [number, number],
): { id: string; points: ProjectedGraphPoint[] } {
  return { id: series.id, points: projectPoints(series.points, view, xRange, yRange) };
}

function projectPoint(
  point: GraphPoint,
  index: number,
  points: GraphPoint[],
  view: ChartView,
  xRange: [number, number],
  yRange: [number, number],
): ProjectedGraphPoint {
  return {
    x: mapRange(point.x, xRange, [view.padding, view.width - view.padding]),
    y: mapY(point.y ?? 0, yRange, view),
    connected: canConnectToPrevious(point, index, points, yRange),
  };
}

function createSvgPath(points: ProjectedGraphPoint[]): string {
  return points.map((point, index) => {
    const command = index === 0 || !point.connected ? 'M' : 'L';
    return `${command} ${formatNumber(point.x)} ${formatNumber(point.y)}`;
  }).join(' ');
}

function splitSegments(points: ProjectedGraphPoint[]): ProjectedGraphPoint[][] {
  const segments: ProjectedGraphPoint[][] = [];
  let currentSegment: ProjectedGraphPoint[] = [];
  points.forEach((point) => {
    if (!point.connected && currentSegment.length > 0) {
      segments.push(currentSegment);
      currentSegment = [];
    }
    currentSegment.push(point);
  });
  return currentSegment.length > 0 ? [...segments, currentSegment] : segments;
}

function canConnectToPrevious(
  point: GraphPoint,
  index: number,
  points: GraphPoint[],
  yRange: [number, number],
): boolean {
  if (index === 0 || point.y === null || !Number.isFinite(point.y)) return false;
  const previous = points[index - 1];
  if (previous.y === null || !Number.isFinite(previous.y)) return false;
  return !isLikelyDiscontinuity(previous.y, point.y, yRange);
}

function isLikelyDiscontinuity(previous: number, current: number, yRange: [number, number]): boolean {
  const jump = Math.abs(current - previous);
  const span = Math.max(Math.abs(yRange[1] - yRange[0]), Number.EPSILON);
  if (jump <= span * DISCONTINUITY_RATIO) return false;
  return Math.sign(previous) !== Math.sign(current);
}

function resolveYRange(points: GraphPoint[]): [number, number] {
  const values = finiteYValues(points);
  if (values.length === 0) return [-1, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

function applyYZoom(yRange: [number, number], zoom: number): [number, number] {
  const normalizedZoom = Number.isFinite(zoom) ? Math.max(0.25, zoom) : 1;
  const center = (yRange[0] + yRange[1]) / 2;
  const halfSpan = (yRange[1] - yRange[0]) / (2 * normalizedZoom);
  return [center - halfSpan, center + halfSpan];
}

function resolveXRange(points: GraphPoint[]): [number, number] {
  if (points.length === 0) return [0, 1];
  const values = points.map((point) => point.x);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

function finiteYValues(points: GraphPoint[]): number[] {
  return points.flatMap((point) => point.y === null || !Number.isFinite(point.y) ? [] : [point.y]);
}

function mapY(value: number, yRange: [number, number], view: ChartView): number {
  const screenRange: [number, number] = [view.height - view.padding, view.padding];
  return mapRange(value, yRange, screenRange);
}

function mapRange(value: number, input: [number, number], output: [number, number]): number {
  const ratio = (value - input[0]) / (input[1] - input[0]);
  return output[0] + ratio * (output[1] - output[0]);
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}
