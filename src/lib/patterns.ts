import { Grid } from './grid';
import { parseRle } from './rle';

export type PatternCategory = 'still' | 'oscillator' | 'spaceship' | 'gun' | 'methuselah';

export interface Pattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  // RLE文字列。rule を省くものは Conway Life (B3/S23) を前提とする。
  rle: string;
}

export const CATEGORY_LABELS: Record<PatternCategory, string> = {
  still: '静物',
  oscillator: '振動子',
  spaceship: '宇宙船',
  gun: '銃',
  methuselah: '長寿型',
};

// LifeWiki で知られる古典パターンを RLE で収録する。周期や移動はテストで検証する。
export const PATTERNS: readonly Pattern[] = [
  { id: 'block', name: 'ブロック', category: 'still', description: '最小の静物', rle: 'x = 2, y = 2\n2o$2o!' },
  {
    id: 'beehive',
    name: '蜂の巣',
    category: 'still',
    description: '六角形の静物',
    rle: 'x = 4, y = 3\nb2o$o2bo$b2o!',
  },
  {
    id: 'loaf',
    name: 'パン',
    category: 'still',
    description: '非対称な静物',
    rle: 'x = 4, y = 4\nb2o$o2bo$bobo$2bo!',
  },
  { id: 'boat', name: '小舟', category: 'still', description: '小さな静物', rle: 'x = 3, y = 3\n2o$obo$bo!' },
  { id: 'blinker', name: '点滅器', category: 'oscillator', description: '周期2', rle: 'x = 3, y = 1\n3o!' },
  { id: 'toad', name: 'ヒキガエル', category: 'oscillator', description: '周期2', rle: 'x = 4, y = 2\nb3o$3o!' },
  {
    id: 'beacon',
    name: '灯台',
    category: 'oscillator',
    description: '周期2',
    rle: 'x = 4, y = 4\n2o$2o$2b2o$2b2o!',
  },
  {
    id: 'pulsar',
    name: 'パルサー',
    category: 'oscillator',
    description: '周期3の大型振動子',
    rle: 'x = 13, y = 13\n2b3o3b3o2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2$2b3o3b3o$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!',
  },
  { id: 'glider', name: 'グライダー', category: 'spaceship', description: '斜めに進む最小の宇宙船', rle: 'x = 3, y = 3\nbo$2bo$3o!' },
  {
    id: 'lwss',
    name: '軽量級宇宙船',
    category: 'spaceship',
    description: '水平に進む宇宙船 (LWSS)',
    rle: 'x = 5, y = 4\nbo2bo$o$o3bo$4o!',
  },
  {
    id: 'gosper-gun',
    name: 'ゴスパーのグライダー銃',
    category: 'gun',
    description: 'グライダーを撃ち続ける無限成長パターン',
    rle: 'x = 36, y = 9\n24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!',
  },
  {
    id: 'r-pentomino',
    name: 'Rペントミノ',
    category: 'methuselah',
    description: '5セルから長く荒れ続ける',
    rle: 'x = 3, y = 3\nb2o$2o$bo!',
  },
  {
    id: 'acorn',
    name: 'どんぐり',
    category: 'methuselah',
    description: '7セルから5000世代以上広がる',
    rle: 'x = 7, y = 3\nbo$3bo$2o2b3o!',
  },
  {
    id: 'diehard',
    name: 'ダイハード',
    category: 'methuselah',
    description: '130世代でちょうど消滅する',
    rle: 'x = 8, y = 3\n6bo$2o$bo3b3o!',
  },
];

const cache = new Map<string, Grid>();

// パターンを Grid に展開する。同じIDは一度だけ解析して使い回す。
export function patternGrid(pattern: Pattern): Grid {
  const cached = cache.get(pattern.id);
  if (cached) return cached.clone();
  const grid = parseRle(pattern.rle).grid;
  cache.set(pattern.id, grid);
  return grid.clone();
}

export function findPattern(id: string): Pattern | undefined {
  return PATTERNS.find((p) => p.id === id);
}
