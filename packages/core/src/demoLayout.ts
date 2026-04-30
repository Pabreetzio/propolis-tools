import type { PlacedLetter, HVec } from '@propolis-tools/renderer';

/**
 * Generate hex-arranged letter centers for a given radius.
 *
 * Centers are in compact letter-space coordinates. The renderer maps them
 * into dot-space with LETTERMOD before adding the 12 per-letter dot offsets.
 * This mirrors the C++ hvec start/inc/cont iteration for a size-n hexagon.
 * radius=1 → 7 centers, radius=2 → 19, radius=3 → 37
 */
export function hexLetterCenters(radius: number): HVec[] {
  const centers: HVec[] = [];
  for (let y = -radius; y <= radius; y++) {
    const minX = y < 0 ? -radius : y - radius;
    const maxX = y < 0 ? y + radius : radius;
    for (let x = minX; x <= maxX; x++) {
      centers.push({ x, y });
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
