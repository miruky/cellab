import type { Rng } from './rng';

// 1次元の基本セルオートマトン (Wolfram のルール0〜255)。
// 各セルの次の値は (左, 自分, 右) の3ビットが作る0〜7の番号で決まり、
// その番号のビットがルール番号の対応位置に立っていれば1になる。
// 例: ルール30 = 00011110 は近傍100(=4)で1、近傍011(=3)で1。

export function stepElementaryRow(row: Uint8Array, rule: number, wrap: boolean): Uint8Array {
  const n = row.length;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const left = i === 0 ? (wrap ? (row[n - 1] ?? 0) : 0) : (row[i - 1] ?? 0);
    const center = row[i] ?? 0;
    const right = i === n - 1 ? (wrap ? (row[0] ?? 0) : 0) : (row[i + 1] ?? 0);
    const index = (left << 2) | (center << 1) | right;
    out[i] = (rule >> index) & 1;
  }
  return out;
}

// 初期行から generations 世代ぶんの履歴を返す。先頭は初期行そのもの。
export function elementaryHistory(
  initial: Uint8Array,
  rule: number,
  generations: number,
  wrap: boolean,
): Uint8Array[] {
  if (!Number.isInteger(rule) || rule < 0 || rule > 255) {
    throw new RangeError(`基本CAのルールは0〜255です: ${rule}`);
  }
  if (generations < 0) throw new RangeError(`世代数は0以上です: ${generations}`);
  const rows: Uint8Array[] = [initial.slice()];
  let current = initial;
  for (let g = 0; g < generations; g++) {
    current = stepElementaryRow(current, rule, wrap);
    rows.push(current);
  }
  return rows;
}

// 中央の1セルだけが生きた初期行。多くのルールで象徴的な三角形模様になる。
export function centeredRow(width: number): Uint8Array {
  const row = new Uint8Array(width);
  row[width >> 1] = 1;
  return row;
}

export function randomRow(width: number, density: number, rng: Rng): Uint8Array {
  const row = new Uint8Array(width);
  for (let i = 0; i < width; i++) row[i] = rng() < density ? 1 : 0;
  return row;
}
