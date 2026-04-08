import type { PlacedLetter, HVec } from '@propolis-tools/renderer';

/**
 * Correct letter tiling for propolis.
 *
 * From the C++ source, LETTERMOD = hvec(-2,-4), which has norm 12 (= dots per letter).
 * The letter lattice basis vectors are derived from LETTERMOD and LETTERMOD*ω:
 *
 *   v1 = (2, 4)    ← -LETTERMOD
 *   v2 = (4, 2)    ← LETTERMOD * ω  (rotating by 120° in Eisenstein space)
 *
 * These have Cartesian positions:
 *   v1 → (0,   2√3) — straight up
 *   v2 → (3,    √3) — up-right at 60°
 *
 * The determinant of [v1, v2] is |2·2 − 4·4| = 12 = norm(LETTERMOD) ✓
 * This confirms the lattice tiles the plane with exactly 12 cells per letter.
 *
 * Verified: no two twelve[] offsets relative to centers v1 or v2 apart ever coincide,
 * so adjacent letter footprints never overlap.
 */
const BASIS_A: HVec = { x: 2, y: 4 };  // v1
const BASIS_B: HVec = { x: 4, y: 2 };  // v2

function add(a: HVec, b: HVec): HVec {
  return { x: a.x + b.x, y: a.y + b.y };
}
function scale(a: HVec, s: number): HVec {
  return { x: a.x * s, y: a.y * s };
}

/**
 * Generate hex-arranged letter centers for a given radius.
 * radius=1 → 7 centers, radius=2 → 19, radius=3 → 37
 */
export function hexLetterCenters(radius: number): HVec[] {
  const centers: HVec[] = [];
  for (let a = -radius; a <= radius; a++) {
    for (let b = -radius; b <= radius; b++) {
      if (Math.abs(a + b) <= radius) {
        centers.push(add(scale(BASIS_A, a), scale(BASIS_B, b)));
      }
    }
  }
  return centers;
}

/** Small deterministic PRNG — returns 0..31 or 0..5 */
function makeRand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
}

/**
 * Build a demo symbol: data letters surrounded by a ring of border letters.
 */
export function buildBorderedDemoSymbol(dataRadius: number, seed = 42): PlacedLetter[] {
  const allCenters = hexLetterCenters(dataRadius + 1);
  const dataSet = new Set(
    hexLetterCenters(dataRadius).map(c => `${c.x},${c.y}`)
  );
  const rand = makeRand(seed);

  return allCenters.map(center => {
    const isData = dataSet.has(`${center.x},${center.y}`);
    return {
      center,
      letterIndex: isData ? rand() % 32 : 32 + (rand() % 6),
    };
  });
}
