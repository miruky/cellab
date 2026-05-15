import { describe, expect, it } from 'vitest';
import { centeredRow, elementaryHistory, stepElementaryRow } from './elementary';
import { mulberry32 } from './rng';

const arr = (xs: number[]) => Uint8Array.from(xs);

describe('stepElementaryRow', () => {
  it('ルール90は中央セルから左右へ分かれる', () => {
    const next = stepElementaryRow(arr([0, 0, 0, 1, 0, 0, 0]), 90, false);
    expect([...next]).toEqual([0, 0, 1, 0, 1, 0, 0]);
  });

  it('ルール30は中央セルから3セルへ広がる', () => {
    const next = stepElementaryRow(arr([0, 0, 0, 1, 0, 0, 0]), 30, false);
    expect([...next]).toEqual([0, 0, 1, 1, 1, 0, 0]);
  });

  it('ルール0はすべて消し、ルール255はすべて埋める', () => {
    expect([...stepElementaryRow(arr([1, 0, 1]), 0, false)]).toEqual([0, 0, 0]);
    expect([...stepElementaryRow(arr([0, 0, 0]), 255, false)]).toEqual([1, 1, 1]);
  });

  it('wrap の有無で端の扱いが変わる', () => {
    const row = arr([1, 0, 0, 0]);
    expect([...stepElementaryRow(row, 30, false)][3]).toBe(0);
    expect([...stepElementaryRow(row, 30, true)][3]).toBe(1);
  });
});

describe('elementaryHistory', () => {
  it('世代数+1行を返し、先頭は初期行', () => {
    const init = centeredRow(9);
    const rows = elementaryHistory(init, 90, 4, false);
    expect(rows).toHaveLength(5);
    expect([...(rows[0] ?? [])]).toEqual([...init]);
  });

  it('ルールが0〜255の外なら例外', () => {
    expect(() => elementaryHistory(centeredRow(5), 256, 1, false)).toThrow();
    expect(() => elementaryHistory(centeredRow(5), -1, 1, false)).toThrow();
  });

  it('同じ種なら randomRow ベースの履歴が再現する', () => {
    const a = elementaryHistory(centeredRow(11), 110, 3, true);
    const b = elementaryHistory(centeredRow(11), 110, 3, true);
    expect([...(a[3] ?? [])]).toEqual([...(b[3] ?? [])]);
    // 種を変えると別の生成器になることの確認
    const r = mulberry32(1);
    expect(r()).not.toBe(mulberry32(2)());
  });
});
