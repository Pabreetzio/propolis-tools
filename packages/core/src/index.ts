export type { EncodeOptions, EncodeResult, EncodePipeline, LetterRole, LetterRoleKind } from './encode.js';
export { encodeText } from './encode.js';
export { encodeTextECC } from './encodeECC.js';
export { hexLetterCenters, buildBorderedDemoSymbol } from './demoLayout.js';
export type {
  HMapCell,
  HMapComparison,
  HMapComparisonRow,
  HMapData,
  HMapHeader,
} from './hmap.js';
export {
  compareHMaps,
  hmapFromPlacedLetters,
  hmapToText,
  parseBinaryHMap,
  parseTextHMap,
} from './hmap.js';
