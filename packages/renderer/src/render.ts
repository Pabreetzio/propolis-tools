import type { HVec, Point, PlacedLetter, BitCanvas, RenderOptions } from './types.js';
import { toCartesian, hvecAdd, hvecMul } from './hvec.js';
import { TWELVE, LETTER_PATTERNS, letterBits } from './letters.js';

/** Eisenstein scale factor applied to letter centers before placing sub-dots. */
const LETTERMOD: HVec = { x: -2, y: -4 };

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
    const scaledCenter = hvecMul(center, LETTERMOD);
    for (let i = 0; i < 12; i++) {
      const pos = hvecAdd(scaledCenter, TWELVE[i]);
      const key = `${pos.x},${pos.y}`;
      const cart = toCartesian(pos, spacing);
      const existing = map.get(key);
      // Negate y so the SVG orientation matches Pierre's PostScript (y-up) rendering.
      // Without this, the whole symbol and individual letter patterns are upside-down.
      map.set(key, {
        cart: { x: cart.x, y: -cart.y },
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

  // Omit width/height so the SVG scales to fill whatever container it's in.
  // viewBox preserves aspect ratio; consumers control pixel size via CSS.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}"`,
    `     preserveAspectRatio="xMidYMid meet"`,
    `     style="display:block;width:100%;height:100%">`,
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
 * Compute each letter's center position in SVG viewBox coordinates.
 * Returns one {x, y} per letter in the same order as the input array.
 *
 * The opts should match those passed to renderToSVG so the coordinate
 * systems align. Useful for hover hit-testing without parsing the SVG.
 */
export function letterCentersInViewBox(
  letters: PlacedLetter[],
  opts: RenderOptions = {},
): Point[] {
  const spacing = opts.gridSpacing ?? DEFAULTS.gridSpacing;
  const pad = opts.padding ?? DEFAULTS.padding;
  const canvas = buildBitCanvas(letters, spacing);
  const ox = -canvas.bounds.minX + pad;
  const oy = -canvas.bounds.minY + pad;

  return letters.map(({ center }) => {
    const scaled = hvecMul(center, LETTERMOD);
    const cart = toCartesian(scaled, spacing);
    // Negate y to match the y-flip applied in buildBitCanvas
    return { x: cart.x + ox, y: -cart.y + oy };
  });
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
