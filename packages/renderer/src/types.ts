/** Eisenstein integer coordinate (x real, y at 120°) */
export interface HVec {
  x: number;
  y: number;
}

/** Cartesian coordinate */
export interface Point {
  x: number;
  y: number;
}

/** A single cell in the bit canvas — a filled or empty hex dot */
export interface BitCell {
  pos: HVec;
  filled: boolean;
}

/**
 * A placed letter on the grid.
 * letterIndex: 0–31 data, 32–37 border
 * center: Eisenstein coord of the letter's reference point
 */
export interface PlacedLetter {
  letterIndex: number;
  center: HVec;
}

/** The full rendered bit canvas — all dots with their Cartesian positions */
export interface BitCanvas {
  cells: Array<{ cart: Point; filled: boolean }>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface RenderOptions {
  /** Radius of each hex dot in SVG units. Default: 0.4 */
  dotRadius?: number;
  /** Spacing between hex grid points. Default: 1.0 */
  gridSpacing?: number;
  /** Fill color for set bits. Default: '#1a1a2e' */
  colorOn?: string;
  /** Fill color for unset bits. Default: '#e8e8f0' */
  colorOff?: string;
  /** Background color. Default: 'white' */
  background?: string;
  /** Padding around the symbol in SVG units. Default: 2 */
  padding?: number;
  /** Whether to show empty (off) dots. Default: true */
  showOff?: boolean;
  /** Shape of each cell. Default: 'circle' */
  dotShape?: 'circle' | 'hexagon';
}
