export interface GraphPoint {
  x: number;
  y: number | null;
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
