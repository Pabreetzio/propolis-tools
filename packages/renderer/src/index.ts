export type { HVec, Point, PlacedLetter, BitCanvas, RenderOptions } from './types.js';
export { toCartesian, hvecAdd, hvecScale, hvecNorm, SQRT3_2 } from './hvec.js';
export { TWELVE, LETTER_PATTERNS, letterBits, filledOffsets } from './letters.js';
export { buildBitCanvas, renderBitCanvasToSVG, renderToSVG, renderLetterToSVG, renderToCanvas } from './render.js';
