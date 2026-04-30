import {
  LETTER_PATTERNS,
  TWELVE,
  hvecAdd,
  hvecMul,
  type HVec,
  type PlacedLetter,
} from '@propolis-tools/renderer';

const LETTERMOD: HVec = { x: -2, y: -4 };
const PAGERAD = 6;
const PAGESIZE = PAGERAD * (PAGERAD + 1) * 3 + 1;
const PAGEMOD: HVec = { x: PAGERAD + 1, y: 2 * PAGERAD + 1 };

export interface HMapHeader {
  bits: number;
  pageRadius: number;
  pageSize: number;
  symbolSize: number;
  check: number;
}

export interface HMapCell {
  x: number;
  y: number;
  value: number;
}

export interface HMapData {
  header?: HMapHeader;
  cells: HMapCell[];
}

export interface HMapComparisonRow {
  x: number;
  y: number;
  cpp?: number;
  web?: number;
  status: 'match' | 'mismatch' | 'missing-cpp' | 'missing-web';
}

export interface HMapComparison {
  rows: HMapComparisonRow[];
  total: number;
  matches: number;
  mismatches: number;
  missingCpp: number;
  missingWeb: number;
}

function key(x: number, y: number) {
  return `${x},${y}`;
}

function readUInt16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readInt16LE(bytes: Uint8Array, offset: number) {
  const value = readUInt16LE(bytes, offset);
  return value & 0x8000 ? value - 0x10000 : value;
}

function readUInt32BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function nthHVec(n: number, size: number, nelts: number): HVec {
  let adjusted = n - Math.floor(nelts / 2);
  let x: number;
  let y: number;
  let row: number;

  if (adjusted < 0) {
    for (adjusted -= size, row = 2 * size + 1, y = 0; adjusted <= 0; adjusted += row--, y--) {
      // Match C++ nthhvec loop.
    }
    y++;
    adjusted -= ++row;
    x = adjusted + y + size;
  } else {
    for (adjusted += size, row = 2 * size + 1, y = 0; adjusted >= 0; adjusted -= row--, y++) {
      // Match C++ nthhvec loop.
    }
    y--;
    adjusted += ++row;
    x = adjusted + y - size;
  }

  return { x, y };
}

function hvecKeySort(a: HMapCell, b: HMapCell) {
  if (a.y !== b.y) return a.y - b.y;
  return a.x - b.x;
}

function pageCellPosition(page: HVec, index: number): HVec {
  return hvecAdd(hvecMul(page, PAGEMOD), nthHVec(index, PAGERAD, PAGESIZE));
}

export function hmapFromPlacedLetters(letters: PlacedLetter[], symbolSize: number): HMapData {
  const cells = new Map<string, HMapCell>();

  for (const { letterIndex, center } of letters) {
    const pattern = LETTER_PATTERNS[letterIndex] ?? 0;
    const scaledCenter = hvecMul(center, LETTERMOD);
    for (let i = 0; i < TWELVE.length; i++) {
      const pos = hvecAdd(scaledCenter, TWELVE[i]);
      const value = (pattern >> i) & 1;
      if (value) {
        cells.set(key(pos.x, pos.y), { x: pos.x, y: pos.y, value });
      }
    }
  }

  return {
    header: {
      bits: 1,
      pageRadius: PAGERAD,
      pageSize: PAGESIZE,
      symbolSize,
      check: 0,
    },
    cells: [...cells.values()].sort(hvecKeySort),
  };
}

export function parseBinaryHMap(bytes: Uint8Array): HMapData {
  if (bytes.length < 16) throw new Error('HMap is too short.');
  const magic = readUInt32BE(bytes, 0);
  if (magic !== 0x47290c05) throw new Error('HMap magic number is invalid.');

  const version = readUInt16LE(bytes, 4);
  const bits = bytes[6];
  const pageRadius = bytes[7];
  const pageSize = readUInt16LE(bytes, 8);
  const symbolSize = readUInt16LE(bytes, 10);
  const check = readUInt16LE(bytes, 14);
  if (version > 0) throw new Error(`Unsupported HMap version ${version}.`);
  if (bits < 1 || bits > 8) throw new Error(`Unsupported HMap bit width ${bits}.`);
  if (pageRadius !== PAGERAD || pageSize !== PAGESIZE) {
    throw new Error(`Unsupported HMap page geometry radius=${pageRadius} size=${pageSize}.`);
  }

  const cells: HMapCell[] = [];
  let offset = 16;
  const packedPageSize = Math.floor(((PAGESIZE + 7) * bits) / 8);
  const mask = (1 << bits) - 1;

  while (offset + 6 <= bytes.length) {
    const stripStart = { x: readInt16LE(bytes, offset), y: readInt16LE(bytes, offset + 2) };
    const stripLength = readUInt16LE(bytes, offset + 4);
    offset += 6;

    for (let pageIndex = 0; pageIndex < stripLength; pageIndex++) {
      if (offset + packedPageSize > bytes.length) throw new Error('HMap strip is truncated.');
      const page = hvecAdd(stripStart, { x: pageIndex, y: 0 });
      for (let i = 0; i < PAGESIZE; i++) {
        const byteIndex = offset + Math.floor((i * bits) / 8);
        const shift = (i * bits) % 8;
        const value = (bytes[byteIndex] >> shift) & mask;
        if (value) {
          const pos = pageCellPosition(page, i);
          cells.push({ x: pos.x, y: pos.y, value });
        }
      }
      offset += packedPageSize;
    }
  }

  return {
    header: { bits, pageRadius, pageSize, symbolSize, check },
    cells: cells.sort(hvecKeySort),
  };
}

export function hmapToText(hmap: HMapData): string {
  return hmap.cells.map((cell) => `${cell.x},${cell.y},${cell.value}`).join('\n') + '\n';
}

export function parseTextHMap(text: string): HMapData {
  const cells = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [x, y, value] = line.split(',').map(Number);
      return { x, y, value };
    })
    .filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y) && Number.isFinite(cell.value));
  return { cells: cells.sort(hvecKeySort) };
}

export function compareHMaps(cpp: HMapData, web: HMapData): HMapComparison {
  const cppCells = new Map(cpp.cells.map((cell) => [key(cell.x, cell.y), cell]));
  const webCells = new Map(web.cells.map((cell) => [key(cell.x, cell.y), cell]));
  const keys = new Set([...cppCells.keys(), ...webCells.keys()]);
  const rows: HMapComparisonRow[] = [];

  for (const cellKey of keys) {
    const cppCell = cppCells.get(cellKey);
    const webCell = webCells.get(cellKey);
    const [x, y] = cellKey.split(',').map(Number);
    if (!cppCell) rows.push({ x, y, web: webCell?.value, status: 'missing-cpp' });
    else if (!webCell) rows.push({ x, y, cpp: cppCell.value, status: 'missing-web' });
    else if (cppCell.value !== webCell.value) rows.push({ x, y, cpp: cppCell.value, web: webCell.value, status: 'mismatch' });
    else rows.push({ x, y, cpp: cppCell.value, web: webCell.value, status: 'match' });
  }

  rows.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  const matches = rows.filter((row) => row.status === 'match').length;
  const mismatches = rows.filter((row) => row.status === 'mismatch').length;
  const missingCpp = rows.filter((row) => row.status === 'missing-cpp').length;
  const missingWeb = rows.filter((row) => row.status === 'missing-web').length;

  return {
    rows,
    total: rows.length,
    matches,
    mismatches,
    missingCpp,
    missingWeb,
  };
}
