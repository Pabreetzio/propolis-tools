import type { HVec } from './types.js';

/**
 * The 12 relative hvec offsets within each letter, from letters.cpp.
 * Index i corresponds to bit i (LSB = index 0). Matches C++ drawletter:
 *   canvas[place*LETTERMOD + twelve[i]] = (letter >> i) & 1
 */
export const TWELVE: readonly HVec[] = [
  { x:  0, y: -2 }, // bit 0
  { x: -1, y: -2 }, // bit 1
  { x: -2, y: -2 }, // bit 2
  { x:  1, y: -1 }, // bit 3
  { x:  0, y: -1 }, // bit 4
  { x: -1, y: -1 }, // bit 5
  { x: -2, y: -1 }, // bit 6
  { x:  1, y:  0 }, // bit 7
  { x:  0, y:  0 }, // bit 8
  { x: -1, y:  0 }, // bit 9
  { x:  1, y:  1 }, // bit 10
  { x:  0, y:  1 }, // bit 11
];

/**
 * The 38 letter bit patterns from letters.cpp (first/original assignment).
 * Indices 0–31: data letters. Indices 32–37: border letters.
 * Each value is a 12-bit pattern; bit 11 = TWELVE[0], bit 0 = TWELVE[11].
 */
export const LETTER_PATTERNS: readonly number[] = [
  0x000, // 0:  00000
  0x007, // 1:  00001
  0xf80, // 2:  00010
  0x01f, // 3:  00011
  0xc00, // 4:  00100
  0x09b, // 5:  00101
  0xf40, // 6:  00110
  0xd99, // 7:  00111
  0xa64, // 8:  01000
  0x067, // 9:  01001
  0x009, // 10: 01010
  0x277, // 11: 01011
  0x488, // 12: 01100
  0x5bf, // 13: 01101
  0xfbb, // 14: 01110
  0xb66, // 15: 01111
  0x499, // 16: 10000
  0x044, // 17: 10001
  0xa40, // 18: 10010
  0xb77, // 19: 10011
  0xd88, // 20: 10100
  0xff6, // 21: 10101
  0xf98, // 22: 10110
  0x59b, // 23: 10111
  0x266, // 24: 11000
  0x0bf, // 25: 11001
  0xf64, // 26: 11010
  0x3ff, // 27: 11011
  0xfe0, // 28: 11100
  0x07f, // 29: 11101
  0xff8, // 30: 11110
  0xfff, // 31: 11111
  // Border letters (indices 32–37)
  0xfe4,
  0xf66,
  0x27f,
  0x0ff,
  0xd9b,
  0xf99,
];

/**
 * Get the 12 filled/empty states for a letter pattern.
 * Returns array of 12 booleans, index i = bit i (LSB = TWELVE[0]).
 * Matches C++ drawletter: canvas[place+twelve[i]] = (letter >> i) & 1.
 */
export function letterBits(pattern: number): boolean[] {
  const bits: boolean[] = [];
  for (let i = 0; i <= 11; i++) {
    bits.push(((pattern >> i) & 1) === 1);
  }
  return bits;
}

/**
 * Get the filled dot positions (hvec relative offsets) for a letter.
 */
export function filledOffsets(letterIndex: number): HVec[] {
  const pattern = LETTER_PATTERNS[letterIndex];
  const bits = letterBits(pattern);
  return TWELVE.filter((_, i) => bits[i]);
}
