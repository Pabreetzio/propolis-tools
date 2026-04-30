import { toCartesian } from '@propolis-tools/renderer';
import type { PlacedLetter, HVec } from '@propolis-tools/renderer';
import { hexLetterCenters } from './demoLayout.js';

/**
 * Simplified propolis encoder — 5-bit packing, no Hamming ECC or
 * criss-cross rearrangement. Produces visually correct symbols that
 * differ meaningfully per input. Full encoding accuracy requires the
 * WASM build of the reference C++ (coming soon).
 */

/** Sort letter centers top-to-bottom, left-to-right for deterministic bit assignment. */
function sortedCenters(centers: HVec[]): HVec[] {
  return [...centers].sort((a, b) => {
    const ca = toCartesian(a);
    const cb = toCartesian(b);
    const dy = ca.y - cb.y;
    if (Math.abs(dy) > 0.01) return dy;
    return ca.x - cb.x;
  });
}

/**
 * Role of each letter in the encoded symbol. Used for hover tooltips.
 *
 * After criss-cross interleaving, individual 'data' cells don't map back
 * to specific message bytes — their 5 bits are spread from across the
 * Hamming-encoded blocks.
 */
export type LetterRoleKind =
  | 'data'                    // carries 5 bits of scrambled, error-coded payload
  | 'metadata-index'          // @ orientation marker — always letter 0 (all-white)
  | 'metadata-encoding'       // encoding mode (mode 8 = raw bytes)
  | 'metadata-nblocks-lo'     // (nBlocks − 1) mod 31 in GF(31)
  | 'metadata-nblocks-hi'     // floor((nBlocks − 1) / 31) in GF(31)
  | 'metadata-lagrange0'      // Lagrange error-check at x=0 over GF(31)
  | 'metadata-lagrange1'      // Lagrange error-check at x=1 over GF(31)
  | 'border-side'             // outer ring side letter (patterns 32–37)
  | 'border-corner';          // outer ring corner letter (fixed data patterns)

export interface LetterRole {
  kind: LetterRoleKind;
  /** For 'data': 0-based slot index within the data hex region */
  dataIndex?: number;
  /** For 'data': total number of data/ECC slots in the hex region */
  totalSlots?: number;
}

/** Intermediate representations exposed for the visual pipeline display. */
export interface EncodePipeline {
  /** Raw UTF-8 bytes of the message */
  utf8Bytes: number[];
  /** One entry per 5-bit group from the message bytes, as Pierre's letter names (@…_) */
  rawLetterNames: string[];
  /** Check letters appended for error detection (same naming, shown separately) */
  checkLetterNames: string[];
  /** The 6 metadata corners placed at fixed positions in the data hexagon */
  cornerLetters: Array<{
    name: string;   // Pierre's letter name (@ through _)
    index: number;  // 5-bit index (0–31)
    role: string;   // human-readable purpose
  }>;
}

export interface EncodeResult {
  letters: PlacedLetter[];
  radius: number;
  /** Number of data letter slots in the hex region */
  dataSlots: number;
  /** Bytes of data encoded */
  bytesEncoded: number;
  /** Max bytes this radius can hold */
  byteCapacity: number;
  /** True if input had to be truncated to fit */
  truncated: boolean;
  /** Actual achieved redundancy fraction (0–0.65), undefined for simplified encoder */
  redundancy?: number;
  /** Per-letter role annotations for hover tooltips (ECC encoder only) */
  letterRoles?: LetterRole[];
  /** Intermediate pipeline steps for the visual pipeline display (ECC encoder only) */
  pipeline?: EncodePipeline;
}

export interface EncodeOptions {
  /** Minimum data radius to render. The encoder may grow if the input does not fit. */
  radius?: number;
}

export function encodeText(text: string, options: EncodeOptions = {}): EncodeResult {
  const encoder = new TextEncoder();
  const requestedRadius = Math.max(1, Math.floor(options.radius ?? 1));
  const MAX_RADIUS = Math.max(8, requestedRadius); // prevents runaway large inputs

  // Pack bytes into 5-bit letter indices
  function pack(bytes: Uint8Array): number[] {
    const indices: number[] = [];
    let buf = 0, bits = 0;
    for (const byte of bytes) {
      buf = (buf << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        indices.push((buf >> bits) & 0x1f);
      }
    }
    if (bits > 0) {
      // Flush remaining bits, zero-padded
      indices.push((buf << (5 - bits)) & 0x1f);
    }
    return indices;
  }

  let bytes = encoder.encode(text);
  let truncated = false;

  // Find radius that fits, capping at MAX_RADIUS
  let letterIndices = pack(bytes);
  let radius = requestedRadius;
  while (radius < MAX_RADIUS && hexLetterCenters(radius).length < letterIndices.length) {
    radius++;
  }

  // If still too long at max radius, truncate input
  const maxSlots = hexLetterCenters(MAX_RADIUS).length;
  if (letterIndices.length > maxSlots) {
    truncated = true;
    // Binary-search for how many bytes fit
    let lo = 0, hi = bytes.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (pack(encoder.encode(text.slice(0, mid))).length <= maxSlots) lo = mid;
      else hi = mid - 1;
    }
    bytes = encoder.encode(text.slice(0, lo));
    letterIndices = pack(bytes);
    radius = MAX_RADIUS;
  }

  const rawCenters = hexLetterCenters(radius);
  const dataSet = new Set(rawCenters.map(c => `${c.x},${c.y}`));

  // Assign letter indices in sorted order
  const sorted = sortedCenters(rawCenters);
  const assignment = new Map<string, number>();
  sorted.forEach((c, i) => {
    assignment.set(`${c.x},${c.y}`, letterIndices[i] ?? 0);
  });

  const letters: PlacedLetter[] = [];
  for (const center of rawCenters) {
    const key = `${center.x},${center.y}`;
    if (dataSet.has(key)) letters.push({ center, letterIndex: assignment.get(key) ?? 0 });
  }

  // Mirror C++ border(n): the border is one letter ring outside the data.
  const border = radius + 1;
  for (let i = 1; i < border; i++) {
    letters.push({ center: { x: border, y: i }, letterIndex: 0x20 });
    letters.push({ center: { x: i, y: border }, letterIndex: 0x21 });
    letters.push({ center: { x: -i, y: border - i }, letterIndex: 0x22 });
    letters.push({ center: { x: -border, y: -i }, letterIndex: 0x23 });
    letters.push({ center: { x: -i, y: -border }, letterIndex: 0x24 });
    letters.push({ center: { x: i, y: i - border }, letterIndex: 0x25 });
  }
  letters.push({ center: { x: border, y: 0 }, letterIndex: 0x02 });
  letters.push({ center: { x: border, y: border }, letterIndex: 0x1a });
  letters.push({ center: { x: 0, y: border }, letterIndex: 0x18 });
  letters.push({ center: { x: -border, y: 0 }, letterIndex: 0x1d });
  letters.push({ center: { x: -border, y: -border }, letterIndex: 0x05 });
  letters.push({ center: { x: 0, y: -border }, letterIndex: 0x07 });

  return {
    letters,
    radius,
    dataSlots: rawCenters.length,
    bytesEncoded: bytes.length,
    byteCapacity: Math.floor(rawCenters.length * 5 / 8),
    truncated,
  };
}
