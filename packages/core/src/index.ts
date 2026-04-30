export type {
  EncodeOptions,
  EncodeResult,
  EncodePipeline,
  LetterRole,
  LetterRoleKind,
  PropolisEncodingMode,
  PropolisEncodingPreference,
} from './encode.js';
export { encodeText } from './encode.js';
export { encodeTextECC, PROPOLIS_ENCODING_LABELS } from './encodeECC.js';
export type { EncodeTextECCOptions } from './encodeECC.js';
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
