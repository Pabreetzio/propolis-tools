/**
 * Full propolis encoder — Hamming ECC + criss-cross + whitening.
 * Faithfully ported from Pierre Abbat's reference C++ implementation.
 * Encoding mode 8 (raw bytes), compatible with the reference decoder.
 */

import type { PlacedLetter, HVec } from '@propolis-tools/renderer';
import type { EncodeResult } from './encode.js';

// ── Constants ────────────────────────────────────────────────────────────────

const ENCODING_BYTE = 8;

/** bitctrot from arrange.cpp — cyclic rotation table for check-letter computation */
const BITCTROT = '@BDLHTXYPEIZQKSWAFJ\\RMU[CNV]G^O_'
  .split('').map(c => c.charCodeAt(0));

/** Prime offsets for the 5 criss-cross layers */
const PRIME = [2, 3, 5, 7, 11] as const;

/**
 * 26 involution permutations of 5 bits (octal, from arrange.cpp).
 * Each entry is a packed representation: bits (3*b)..(3*b+2) give
 * the destination bit position for source bit b.
 */
const BITPERMTAB0 = [
  0o43210, 0o43201, 0o43120, 0o42310, 0o34210, 0o03214,
  0o43012, 0o41230, 0o23410, 0o40213, 0o13240,
  0o42301, 0o34120, 0o02314, 0o34201, 0o03124,
  0o41032, 0o21430, 0o20413, 0o10243, 0o13042,
  0o40123, 0o12340, 0o34012, 0o01234, 0o23401,
];

// ── Bit permutation table (lazy) ─────────────────────────────────────────────

let _bitPermTab: number[][] | null = null;

function getBitPermTab(): number[][] {
  if (_bitPermTab) return _bitPermTab;
  _bitPermTab = [];
  for (let i = 0; i < 26; i++) {
    const perm = new Array(32).fill(0);
    for (let j = 0; j < 32; j++) {
      let val = 0;
      for (let b = 0; b < 5; b++) {
        if ((j >> b) & 1) val += 1 << ((BITPERMTAB0[i] >> (3 * b)) & 7);
      }
      perm[j] = val;
    }
    _bitPermTab.push(perm);
  }
  return _bitPermTab;
}

// ── Math helpers ─────────────────────────────────────────────────────────────

/** Odd-field multiplication — operates on raw char values (0x40–0x5F range) */
function oddmul(a: number, b: number): number {
  return (((2 * a + 1) * (2 * b + 1)) >> 1) & 31;
}

/**
 * Apply index-dependent substitution to a 5-bit letter so that a symbol
 * encoding all the same letter doesn't produce a uniform bit pattern.
 * Operates on values with high bits (bit 6 = 0x40 for data chars).
 */
function whiten(letter: number, index: number): number {
  const highbits = letter & ~31;
  let l = letter & 31;
  l = getBitPermTab()[index % 26][l ^ ((index % 31) + 1)];
  return l | highbits;
}

/** Number of data bits in a Hamming codeword of length codebits */
function databits(codebits: number): number {
  let ret = codebits;
  let c = codebits;
  while (c) { c = Math.floor(c / 2); ret--; }
  return ret;
}

function totalDatabits(codebits: number[]): number {
  return codebits.reduce((s, n) => s + databits(n), 0);
}

function gcd(a: number, b: number): number {
  while (a && b) {
    if (a > b) { const t = a; a = b; b = t; }
    b %= a;
  }
  return a + b;
}

/** Number of data-letter slots in a symbol of hex radius n (excludes 6 metadata corners) */
function ndataletters(n: number): number {
  const nl = n * (n + 1) * 3 + 1;
  return nl - 6 - (nl > 961 * 3 ? 1 : 0);
}

// ── Hamming block arrangement ─────────────────────────────────────────────────

/**
 * Given nLetters total slots and nBlocks blocks, compute the optimal
 * block sizes (mix of two consecutive Hamming code sizes).
 * Returns [] if any size would be a power of 2 (forbidden).
 */
function arrangeHamming(nLetters: number, nBlocks: number): number[] {
  if (nBlocks === 0) return [];
  let bs1 = 3;
  while (bs1 * nBlocks <= nLetters) bs1 = 2 * bs1 + 1;
  const bs0 = Math.floor(bs1 / 2);
  let nb1 = 0;
  while (nb1 < nBlocks && nb1 * bs1 + (nBlocks - nb1) * bs0 < nLetters) nb1++;
  let xs = nb1 * bs1 + (nBlocks - nb1) * bs0 - nLetters;
  const xs1 = xs % (nb1 + nBlocks);
  const xs0 = xs1 > nb1 ? xs1 - nb1 : 0;
  xs = Math.floor(xs / (nb1 + nBlocks));
  const ret: number[] = [];
  for (let i = 0; i < nBlocks; i++) {
    const sz = ((i < nb1) ? bs1 - 2 * xs : bs0 - xs)
      - (nBlocks - 1 - i < xs0 ? 1 : 0)
      - (i < nb1 && nb1 - 1 - i < xs1 ? 1 : 0);
    ret.push(sz);
  }
  if (ret.some(s => s > 0 && (s & (s - 1)) === 0)) return []; // no power-of-2 sizes
  return ret;
}

// ── Criss-cross factor ────────────────────────────────────────────────────────

/**
 * Find [multiplier, offset] for the criss-cross rearrangement.
 * multiplier: element of least order ≥ 5 in Z/nZ
 * offset: starting position maximising minimum spread among the 5 layer positions
 */
function crissCrossFactor(n: number): [number, number] {
  let minsofar = n, maxsofar = 0, ret0 = 1;
  // Find element with smallest multiplicative order ≥ 5
  for (let i = 1; i < n; i++) {
    let j = 0, k = 1;
    while (j < minsofar && (j === 0 || (k > 1 && k < n - 1))) { k = (k * i) % n; j++; }
    if (j >= 5 && j < minsofar && (k === 1 || k === n - 1)) { minsofar = j; ret0 = i; }
  }
  // Find starting offset maximising min distance from 0 or n over 5 successive powers
  for (let i = 1; i < n; i++) {
    if (gcd(i, n) !== 1) continue;
    let localMin = n, k = i;
    for (let j = 0; j < 5; j++, k = (k * ret0) % n) {
      if (k < localMin) localMin = k;
      if (n - k < localMin) localMin = n - k;
    }
    if (localMin > maxsofar) maxsofar = localMin;
  }
  return [ret0, maxsofar];
}

// ── Symbol size finder ────────────────────────────────────────────────────────

interface SizeResult {
  size: number;
  nLetters: number;
  nDataCheck: number;   // slots that hold data+check letters (≤ nLetters)
  hammingSizes: number[];
  nBlocks: number;
}

const MAX_RADIUS = 8;

function findSize(nDataLetters: number, redundancy = 0): SizeResult | null {
  const nData = nDataLetters; // target: nDataCheck > nData
  let lastGood: SizeResult | null = null;
  const minSize = Math.max(2, Math.floor(Math.sqrt((nData + 1) / 3)) - 1);

  for (let size = minSize; size <= MAX_RADIUS; size++) {
    const nLetters = ndataletters(size);
    const maxBlocks = nLetters % 3 ? Math.floor((nLetters - 4) / 3) : Math.floor(nLetters / 3);

    // Binary search for minimum nBlocks where nDataCheck > nData
    let minBl = 0, maxBl = maxBlocks + 1;
    while (maxBl - minBl > 1) {
      const mid = Math.floor((minBl + maxBl) / 2);
      const sizes = arrangeHamming(nLetters, mid);
      const dc = sizes.length ? totalDatabits(sizes) : 0;
      if (dc > nData) minBl = mid;
      else maxBl = mid;
    }

    const nBlocks = minBl;
    let hammingSizes: number[] = [];
    let nDataCheck = nLetters;

    if (nBlocks) {
      hammingSizes = arrangeHamming(nLetters, nBlocks);
      nDataCheck = hammingSizes.length ? totalDatabits(hammingSizes) : 0;
    }

    const goodRedundancy = nBlocks > 0 && (nLetters - nDataCheck) / nLetters > redundancy;
    const tooFar = nDataCheck - nData > 32;

    if (nBlocks && nDataCheck > nData && !tooFar) {
      lastGood = { size, nLetters, nDataCheck, hammingSizes, nBlocks };
    }
    if (goodRedundancy || tooFar) break;
  }
  return lastGood;
}

// ── Check-letter padding ──────────────────────────────────────────────────────

/**
 * Append check letters to bring str up to targetLen.
 * Operates on raw char codes (0x40–0x5F).
 */
function appendCheckLetters(str: number[], targetLen: number): number[] {
  const result = [...str];
  const numChecks = targetLen - str.length;
  if (numChecks <= 0 || numChecks > 32) return result;
  for (let i = 0; i < numChecks; i++) {
    let acc = 0x40 + numChecks - i - 1;
    for (let j = 0; j < result.length; j++) acc = BITCTROT[oddmul(acc, result[j])];
    acc ^= i;
    result.push(acc);
  }
  return result;
}

// ── Hamming encoder ───────────────────────────────────────────────────────────

/**
 * Hamming-encode an array of data chars (raw 0x40–0x5F values).
 * Inserts parity elements at power-of-2 positions (1-indexed).
 * Returns the full codeword including parity elements.
 */
function hammingEncode(dataChars: number[]): number[] {
  const code: number[] = [];
  for (const byte of dataChars) {
    // Insert parity slots before adding data
    while ((code.length & (code.length + 1)) === 0) code.push(0);
    code.push(byte);
    const sz = code.length;
    for (let i = 1; i <= sz; i <<= 1) {
      if (i & sz) code[i - 1] ^= byte;
    }
  }
  return code;
}

// ── Metadata Lagrange check (GF(31)) ─────────────────────────────────────────

/**
 * Precomputed Lagrange basis coefficients for evaluating the interpolating
 * polynomial (through x=2,3,4,5) at x=0 and x=1, all in GF(31).
 *
 * p(0) = 10·v2 + 11·v3 + 15·v4 + 27·v5  (mod 31)
 * p(1) =  4·v2 + 25·v3 +  4·v4 + 30·v5  (mod 31)
 */
const LAG_AT_0 = [10, 11, 15, 27] as const;
const LAG_AT_1 = [4, 25, 4, 30] as const;

/**
 * Compute the two Lagrange check values for the 6-letter metadata.
 * known[0..3] = GF(31) values at x=2,3,4,5 respectively.
 * Returns [check_at_0, check_at_1].
 */
function lagrangeCheck(known: [number, number, number, number]): [number, number] {
  let p0 = 0, p1 = 0;
  for (let i = 0; i < 4; i++) {
    p0 = (p0 + LAG_AT_0[i] * known[i]) % 31;
    p1 = (p1 + LAG_AT_1[i] * known[i]) % 31;
  }
  return [((p0 % 31) + 31) % 31, ((p1 % 31) + 31) % 31];
}

// ── HVec iteration (mirrors C++ start/inc/cont) ───────────────────────────────

function hvecNorm(x: number, y: number): number {
  return x * x + y * y - x * y;
}

function* hvecIterate(size: number): Generator<[number, number]> {
  let x = -size, y = -size;
  while (y <= size) {
    yield [x, y];
    x++;
    if (y < 0) {
      if (x - y > size) { y++; x = -size; }
    } else {
      if (x > size) { y++; x = y - size; }
    }
  }
}

// ── Main encoder ──────────────────────────────────────────────────────────────

export function encodeTextECC(text: string, redundancy = 0): EncodeResult {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  // Step 1 — byte-pack input into 5-bit letter chars (0x40–0x5F)
  const letterChars: number[] = [];
  let buf = 0, bits = 0;
  for (const byte of bytes) {
    buf = (buf << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      letterChars.push(0x40 | ((buf >> bits) & 0x1f));
    }
  }
  if (bits > 0) letterChars.push(0x40 | ((buf << (5 - bits)) & 0x1f));

  // Step 2 — find symbol size and Hamming block layout
  const sr = findSize(letterChars.length, redundancy);
  if (!sr) throw new Error(`Text too long for max radius ${MAX_RADIUS}`);
  const { size, nLetters, nDataCheck, hammingSizes, nBlocks } = sr;

  // Step 3 — pad to nDataCheck with check letters
  const withChecks = appendCheckLetters(letterChars, nDataCheck);

  // Step 4 — Hamming-encode each block
  const unCrissCrossed: number[] = [];
  let k = 0;
  for (const blockSize of hammingSizes) {
    const nd = databits(blockSize);
    const slice = withChecks.slice(k, k + nd);
    k += nd;
    unCrissCrossed.push(...hammingEncode(slice));
  }

  // Step 5 — criss-cross rearrangement
  const [ccf0, ccf1] = crissCrossFactor(nLetters);
  const ccf5 = [ccf1];
  for (let i = 1; i < 5; i++) ccf5.push((ccf5[i - 1] * ccf0) % nLetters);

  const data = new Array(nLetters).fill(0x40);
  for (let i = 0; i < nLetters; i++) {
    for (let j = 0; j < 5; j++) {
      const pos = (i * ccf5[j] + PRIME[j]) % nLetters;
      data[pos] |= unCrissCrossed[i] & (1 << j);
    }
  }

  // Step 6 — whitening
  for (let i = 0; i < nLetters; i++) data[i] = whiten(data[i], i);

  // Step 7 — metadata (6 corner letters with Lagrange check)
  // lagrange values at x=2,3,4,5: encoding-1, (nBlocks-1)%31, floor((nBlocks-1)%961/31), '@'-'A'=30
  const kb = nBlocks - 1;
  const v2 = ENCODING_BYTE - 1;      // 7
  const v3 = kb % 31;
  const v4 = Math.floor((kb % 961) / 31);
  const v5 = 30; // '@' - 'A' = -1 mod 31
  const [lc0, lc1] = lagrangeCheck([v2, v3, v4, v5]);

  // Corner positions and their metadata char values
  // Placement: (-size,0)=meta[0], (0,size)=meta[1], (size,size)=meta[2],
  //            (size,0)=meta[3], (0,-size)=meta[4], (-size,-size)=meta[5]
  const cornerMap = new Map<string, number>([
    [`${-size},0`,    0x40],                               // '@'  — index marker
    [`0,${size}`,     v4 + 0x41],                          // (kb%961)/31 + 'A'
    [`${size},${size}`, v3 + 0x41],                        // kb%31 + 'A'
    [`${size},0`,     ENCODING_BYTE + 0x40],               // encoding + '@'
    [`0,${-size}`,    lc1 + 0x41],                         // Lagrange check 1
    [`${-size},${-size}`, lc0 + 0x41],                    // Lagrange check 0
  ]);

  // Step 8 — place letters in hex grid (canonical iteration order)
  const letters: PlacedLetter[] = [];
  let dataIdx = 0;

  for (const [x, y] of hvecIterate(size)) {
    const center: HVec = { x, y };
    const key = `${x},${y}`;
    if (cornerMap.has(key)) {
      letters.push({ center, letterIndex: cornerMap.get(key)! & 0x1f });
    } else {
      const charVal = dataIdx < data.length ? data[dataIdx++] : 0x40;
      letters.push({ center, letterIndex: charVal & 0x1f });
    }
  }

  return {
    letters,
    radius: size,
    dataSlots: nLetters,
    bytesEncoded: bytes.length,
    byteCapacity: Math.floor(nDataCheck * 5 / 8),
    truncated: false,
    redundancy: nBlocks > 0 ? (nLetters - nDataCheck) / nLetters : 0,
  };
}

// ── Test exports (internal functions exposed for unit testing) ────────────────

export const _test_databits = databits;
export const _test_arrangeHamming = arrangeHamming;
export const _test_crissCrossFactor = crissCrossFactor;
export const _test_whiten = whiten;
export const _test_appendCheckLetters = appendCheckLetters;
export const _test_hammingEncode = hammingEncode;
export const _test_findSize = findSize;

export function _test_encodeByte(text: string): number[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const letterChars: number[] = [];
  let buf = 0, bits = 0;
  for (const byte of bytes) {
    buf = (buf << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      letterChars.push(0x40 | ((buf >> bits) & 0x1f));
    }
  }
  if (bits > 0) letterChars.push(0x40 | ((buf << (5 - bits)) & 0x1f));
  return letterChars;
}
