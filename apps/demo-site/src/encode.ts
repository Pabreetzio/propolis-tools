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
}

export function encodeText(text: string): EncodeResult {
  const encoder = new TextEncoder();
  const MAX_RADIUS = 8; // prevents runaway large inputs

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
  let radius = 1;
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
  const borderCenters = hexLetterCenters(radius + 1);
  const dataSet = new Set(rawCenters.map(c => `${c.x},${c.y}`));

  // Assign letter indices in sorted order
  const sorted = sortedCenters(rawCenters);
  const assignment = new Map<string, number>();
  sorted.forEach((c, i) => {
    assignment.set(`${c.x},${c.y}`, letterIndices[i] ?? 0);
  });

  const letters: PlacedLetter[] = borderCenters.map(center => {
    const key = `${center.x},${center.y}`;
    if (dataSet.has(key)) {
      return { center, letterIndex: assignment.get(key) ?? 0 };
    }
    // Alternate border letters based on position for visual variety
    const cx = toCartesian(center);
    const borderIdx = Math.abs(Math.round(cx.x * 3 + cx.y * 7)) % 6;
    return { center, letterIndex: 32 + borderIdx };
  });

  return {
    letters,
    radius,
    dataSlots: rawCenters.length,
    bytesEncoded: bytes.length,
    byteCapacity: Math.floor(rawCenters.length * 5 / 8),
    truncated,
  };
}
