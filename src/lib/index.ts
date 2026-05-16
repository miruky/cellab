// 描画に依存しない中核ロジックの公開API。ここだけでセルオートマトンの
// 盤面・ルール・進行・解析・共有が完結する。UIはこの上に薄く載る。

export { Grid, type BoundingBox, type StampMode } from './grid';
export { mulberry32, type Rng } from './rng';
export { type Rule, type RulePreset, RULE_PRESETS, parseRule, formatRule } from './rule';
export { type Topology, countNeighbors, step } from './life';
export {
  stepElementaryRow,
  elementaryHistory,
  centeredRow,
  randomRow,
} from './elementary';
export { type ParsedRle, type ToRleOptions, parseRle, toRle } from './rle';
export {
  type Pattern,
  type PatternCategory,
  PATTERNS,
  CATEGORY_LABELS,
  patternGrid,
  findPattern,
} from './patterns';
export { type StateKind, type Classification, classify } from './analysis';
export {
  type SeedKind,
  type State2D,
  type State1D,
  type LabState,
  encodeState,
  decodeState,
} from './share';
