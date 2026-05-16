import { describe, expect, it } from 'vitest';
import { Grid } from './grid';
import { parseRle, toRle } from './rle';
import { formatRule } from './rule';

describe('parseRle', () => {
  it('グライダーを正しく展開する', () => {
    const { grid } = parseRle('x = 3, y = 3\nbo$2bo$3o!');
    expect(grid.equals(Grid.fromStrings(['.O.', '..O', 'OOO']))).toBe(true);
  });

  it('ヘッダのルールとコメントを読む', () => {
    const parsed = parseRle('#N Glider\n#C a comment\nx = 3, y = 3, rule = B3/S23\nbo$2bo$3o!');
    expect(parsed.name).toBe('Glider');
    expect(parsed.comments).toContain('C a comment');
    expect(parsed.rule && formatRule(parsed.rule)).toBe('B3/S23');
  });

  it('空白・改行を含む本体を許容する', () => {
    const { grid } = parseRle('x = 3, y = 3\nbo$\n 2bo $\n3o !');
    expect(grid.population()).toBe(5);
  });

  it('ヘッダが無ければ例外', () => {
    expect(() => parseRle('bo$2bo$3o!')).toThrow();
  });

  it('複数行の空行 (2$) を扱う', () => {
    const { grid } = parseRle('x = 1, y = 3\no2$o!');
    expect(grid.get(0, 0)).toBe(1);
    expect(grid.get(0, 1)).toBe(0);
    expect(grid.get(0, 2)).toBe(1);
  });
});

describe('toRle', () => {
  it('既定では生きたセルの矩形に切り詰める', () => {
    const g = new Grid(8, 8);
    g.stamp(Grid.fromStrings(['.O.', '..O', 'OOO']), 2, 2);
    const text = toRle(g);
    expect(text).toContain('x = 3, y = 3');
    const { grid } = parseRle(text);
    expect(grid.equals(Grid.fromStrings(['.O.', '..O', 'OOO']))).toBe(true);
  });

  it('ルール名を付けて書き出せる', () => {
    const text = toRle(Grid.fromStrings(['OO', 'OO']), { rule: 'B3/S23', name: 'block' });
    expect(text).toContain('#N block');
    expect(text).toContain('rule = B3/S23');
  });

  it('crop:false は盤面の大きさを保つ', () => {
    const g = new Grid(5, 4);
    g.set(1, 1, 1);
    const text = toRle(g, { crop: false });
    expect(text).toContain('x = 5, y = 4');
    expect(parseRle(text).grid.equals(g)).toBe(true);
  });

  it('空盤面は 1x1 として往復できる', () => {
    const text = toRle(new Grid(6, 6));
    expect(text).toContain('x = 1, y = 1');
    expect(parseRle(text).grid.population()).toBe(0);
  });

  it('さまざまな盤面で往復しても一致する', () => {
    const samples = [
      Grid.fromStrings(['OOO']),
      Grid.fromStrings(['O.O', '.O.', 'O.O']),
      Grid.fromStrings(['O', 'O', 'O', 'O', 'O']),
    ];
    for (const g of samples) {
      expect(parseRle(toRle(g)).grid.equals(g)).toBe(true);
    }
  });
});
