export interface GraphPoint {
  x: number;
  y: number | null;
}

export type GraphSeriesKind = 'parametric' | 'scalar';

export interface GraphSeries {
  id: string;
  kind: GraphSeriesKind;
  label: string;
  points: GraphPoint[];
}

export interface GraphRender {
  dimensions: number;
  expression: string;
  points: GraphPoint[];
  primarySeries: GraphSeries;
  series: GraphSeries[];
}

export interface GraphConfig {
  sampleCount: number;
  domainStart: number;
  domainEnd: number;
}

export interface CoordinatePoint {
  x: number;
  y: number;
}
