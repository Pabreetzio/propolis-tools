import type { PlacedLetter, HVec } from '@propolis-tools/renderer';

/**
 * Each propolis letter occupies 12 dots. Adjacent letters tile the hex plane
 * when their centers are separated by the letter period vector.
 *
 * From the C++ source: LETTERMOD = hvec(-2, -4)
 * The six nearest letter-center neighbors can be derived from this.
 *
 * For a "size N" symbol, letter centers fill a hexagonal region.
 * This function builds a small demo arrangement manually, since we don't
 * have the encoder yet. It arranges letters in a hexagonal grid using
 * known valid center offsets.
 *
 * Letter centers are spaced by vectors that keep the twelve[] footprints
 * non-overlapping. From inspection of the C++ source:
 *   period1 = hvec(3, 0)   — move right by 3 units
 *   period2 = hvec(0, 3)   — move upper-left by 3 units
 *
 * (The twelve[] footprint spans x: -2..1, y: -2..1, fitting in a 3×3 cell)
 */

// Basis vectors for tiling letter centers (3 units apart in each hex direction)
const BASIS_A: HVec = { x: 3, y: 0 };
const BASIS_B: HVec = { x: 0, y: 3 };

function add(a: HVec, b: HVec): HVec {
  return { x: a.x + b.x, y: a.y + b.y };
}
function scale(a: HVec, s: number): HVec {
  return { x: a.x * s, y: a.y * s };
}

/**
 * Build a hexagonal arrangement of letter centers for a given "radius".
 * radius=1 → 7 letters, radius=2 → 19 letters, radius=3 → 37 letters
 */
export function hexLetterCenters(radius: number): HVec[] {
  const centers: HVec[] = [];
  for (let a = -radius; a <= radius; a++) {
    for (let b = -radius; b <= radius; b++) {
      if (Math.abs(a + b) <= radius) {
        const pos = add(scale(BASIS_A, a), scale(BASIS_B, b));
        centers.push(pos);
      }
    }
  }
  return centers;
}

/**
 * Build a demo propolis symbol with random letter indices.
 * Uses a seeded pseudo-random for reproducibility.
 */
export function buildDemoSymbol(
  radius: number,
  seed = 42,
  borderIndices = false,
): PlacedLetter[] {
  const centers = hexLetterCenters(radius);
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s; };

  return centers.map(center => ({
    center,
    letterIndex: borderIndices ? 32 + (rand() % 6) : rand() % 32,
  }));
}

/**
 * Build a symbol where border letters surround data letters.
 */
export function buildBorderedDemoSymbol(dataRadius: number, seed = 42): PlacedLetter[] {
  const allCenters = hexLetterCenters(dataRadius + 1);
  const dataCenters = hexLetterCenters(dataRadius);
  const dataSet = new Set(dataCenters.map(c => `${c.x},${c.y}`));

  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s; };

  return allCenters.map(center => {
    const isData = dataSet.has(`${center.x},${center.y}`);
    return {
      center,
      letterIndex: isData ? rand() % 32 : 32 + (rand() % 6),
    };
  });
}
