/**
 * 実験の状態をURLのフラグメントに載せて共有する。符号化の本体は src/lib/share.ts に
 * あり、ここはハッシュ文字列との出し入れと、共有リンクの組み立てだけを受け持つ。
 * 2次元は盤そのものを連長符号で、1次元はルールと種を載せる。
 */

import { encodeState, decodeState, type LabState } from './lib';

/** 状態を `#...` のハッシュ文字列にする。 */
export function encodeHash(state: LabState): string {
  return '#' + encodeState(state);
}

/** ハッシュ文字列を状態に戻す。形式が不正なら null。 */
export function parseHash(hash: string): LabState | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') return null;
  try {
    return decodeState(raw);
  } catch {
    return null;
  }
}

/** 現在のページURLに状態のハッシュを付けた絶対URLを作る。 */
export function shareUrl(base: string, state: LabState): string {
  const url = base.split('#')[0] ?? base;
  return url + encodeHash(state);
}
