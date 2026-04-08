import type { HVec, Point, PlacedLetter, BitCanvas, RenderOptions } from './types.js';
import { toCartesian, hvecAdd } from './hvec.js';
import { TWELVE, LETTER_PATTERNS, letterBits } from './letters.js';

const DEFAULTS: Required<RenderOptions> = {
  dotRadius: 0.42,
  gridSpacing: 1.0,
  colorOn: '#1a1a2e',
  colorOff: '#e2e2ee',
  background: '#ffffff',
  padding: 2.5,
  showOff: true,
};

/**
 * Build a flat bit canvas from an array of placed letters.
 * Each letter contributes 12 dot positions; overlapping positions
 * take the OR of their bits (shouldn't happen in valid codes).
 */
export function buildBitCanvas(
  letters: PlacedLetter[],
  spacing = 1.0,
): BitCanvas {
  const map = new Map<string, { cart: Point; filled: boolean }>();

  for (const { letterIndex, center } of letters) {
    const bits = letterBits(LETTER_PATTERNS[letterIndex] ?? 0);
    for (let i = 0; i < 12; i++) {
      const pos = hvecAdd(center, TWELVE[i]);
      const key = `${pos.x},${pos.y}`;
      const cart = toCartesian(pos, spacing);
      const existing = map.get(key);
      map.set(key, {
        cart,
        filled: (existing?.filled ?? false) || bits[i],
      });
    }
  }

  const cells = Array.from(map.values());
  const xs = cells.map(c => c.cart.x);
  const ys = cells.map(c => c.cart.y);

  return {
    cells,
    bounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    },
  };
}

/**
 * Render a bit canvas to an SVG string.
 */
export function renderBitCanvasToSVG(
  canvas: BitCanvas,
  opts: RenderOptions = {},
): string {
  const o = { ...DEFAULTS, ...opts };
  const { bounds } = canvas;

  const pad = o.padding;
  const w = bounds.maxX - bounds.minX + pad * 2;
  const h = bounds.maxY - bounds.minY + pad * 2;
  const ox = -bounds.minX + pad;
  const oy = -bounds.minY + pad;

  const circles = canvas.cells
    .filter(c => o.showOff || c.filled)
    .map(c => {
      const cx = (c.cart.x + ox).toFixed(3);
      const cy = (c.cart.y + oy).toFixed(3);
      const fill = c.filled ? o.colorOn : o.colorOff;
      return `  <circle cx="${cx}" cy="${cy}" r="${o.dotRadius}" fill="${fill}"/>`;
    })
    .join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}"`,
    `     width="${w.toFixed(3)}" height="${h.toFixed(3)}">`,
    `  <rect width="100%" height="100%" fill="${o.background}"/>`,
    circles,
    `</svg>`,
  ].join('\n');
}

/**
 * Render placed letters directly to SVG (convenience wrapper).
 */
export function renderToSVG(
  letters: PlacedLetter[],
  opts: RenderOptions = {},
): string {
  const spacing = opts.gridSpacing ?? DEFAULTS.gridSpacing;
  const canvas = buildBitCanvas(letters, spacing);
  return renderBitCanvasToSVG(canvas, opts);
}

/**
 * Render a single letter pattern to SVG (useful for galleries/debugging).
 */
export function renderLetterToSVG(
  letterIndex: number,
  opts: RenderOptions = {},
): string {
  return renderToSVG([{ letterIndex, center: { x: 0, y: 0 } }], opts);
}

/**
 * Render to an HTML Canvas element (browser only).
 */
export function renderToCanvas(
  letters: PlacedLetter[],
  canvas: HTMLCanvasElement,
  opts: RenderOptions = {},
): void {
  const o = { ...DEFAULTS, ...opts };
  const spacing = opts.gridSpacing ?? DEFAULTS.gridSpacing;
  const bc = buildBitCanvas(letters, spacing);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio ?? 1;
  const pad = o.padding;
  const w = bc.bounds.maxX - bc.bounds.minX + pad * 2;
  const h = bc.bounds.maxY - bc.bounds.minY + pad * 2;
  const ox = -bc.bounds.minX + pad;
  const oy = -bc.bounds.minY + pad;

  // Scale so the symbol fills the canvas
  const scaleX = canvas.width / dpr / w;
  const scaleY = canvas.height / dpr / h;
  const scale = Math.min(scaleX, scaleY);

  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  ctx.fillStyle = o.background;
  ctx.fillRect(0, 0, w, h);

  for (const cell of bc.cells) {
    if (!o.showOff && !cell.filled) continue;
    ctx.beginPath();
    ctx.arc(cell.cart.x + ox, cell.cart.y + oy, o.dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = cell.filled ? o.colorOn : o.colorOff;
    ctx.fill();
  }
}
