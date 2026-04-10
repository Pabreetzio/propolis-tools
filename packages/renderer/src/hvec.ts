import type { HVec, Point } from './types.js';

export const SQRT3_2 = Math.sqrt(3) / 2; // ≈ 0.866

/**
 * Convert an Eisenstein integer to Cartesian coordinates.
 * The y-axis in hvec is at 120° from x, so:
 *   cart.x = hvec.x - hvec.y / 2
 *   cart.y = hvec.y * (√3 / 2)
 */
export function toCartesian(h: HVec, spacing = 1): Point {
  return {
    x: (h.x - h.y / 2) * spacing,
    y: h.y * SQRT3_2 * spacing,
  };
}

export function hvecAdd(a: HVec, b: HVec): HVec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function hvecScale(a: HVec, s: number): HVec {
  return { x: a.x * s, y: a.y * s };
}

export function hvecNorm(a: HVec): number {
  return a.x * a.x + a.y * a.y - a.x * a.y;
}

/**
 * Eisenstein integer multiplication: (ax + ay·ω)(bx + by·ω)
 * where ω² = ω - 1 (since ω = e^{2πi/3}).
 * Result: x = ax·bx - ay·by, y = ax·by + ay·bx - ay·by
 * Matches C++ hvec::operator*.
 */
export function hvecMul(a: HVec, b: HVec): HVec {
  return {
    x: a.x * b.x - a.y * b.y,
    y: a.x * b.y + a.y * b.x - a.y * b.y,
  };
}
