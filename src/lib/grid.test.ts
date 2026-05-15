import { describe, expect, it } from 'vitest';
import { Grid } from './grid';
import { mulberry32 } from './rng';

describe('Grid', () => {
  it('大きさが不正なら例外を投げる', () => {
    expect(() => new Grid(0, 5)).toThrow();
    expect(() => new Grid(5, -1)).toThrow();
    expect(() => new Grid(3, 3, new Uint8Array(8))).toThrow();
  });

  it('範囲外は get が0、set が無視される', () => {
    const g = new Grid(3, 3);
    expect(g.get(-1, 0)).toBe(0);
    expect(g.get(3, 0)).toBe(0);
    g.set(5, 5, 1);
    expect(g.population()).toBe(0);
  });

  it('set/toggle と population', () => {
    const g = new Grid(4, 4);
    g.set(1, 1, 1);
    g.set(2, 2, 9); // 0以外は1に丸める
    expect(g.get(2, 2)).toBe(1);
    expect(g.population()).toBe(2);
    g.toggle(1, 1);
    expect(g.get(1, 1)).toBe(0);
    expect(g.population()).toBe(1);
  });

  it('fromStrings は行配列を盤面にする', () => {
    const g = Grid.fromStrings(['.O.', 'OOO']);
    expect(g.width).toBe(3);
    expect(g.height).toBe(2);
    expect(g.population()).toBe(4);
    expect(g.get(1, 0)).toBe(1);
    expect(g.get(0, 0)).toBe(0);
  });

  it('boundingBox は生きたセルの最小矩形、空なら null', () => {
    expect(new Grid(3, 3).boundingBox()).toBeNull();
    const g = Grid.fromStrings(['....', '.OO.', '..O.']);
    expect(g.boundingBox()).toEqual({ minX: 1, minY: 1, maxX: 2, maxY: 2 });
  });

  it('clone は独立した複製、equals は内容比較', () => {
    const g = Grid.fromStrings(['OO', 'O.']);
    const c = g.clone();
    expect(g.equals(c)).toBe(true);
    c.set(1, 1, 1);
    expect(g.equals(c)).toBe(false);
    expect(g.get(1, 1)).toBe(0);
  });

  it('stamp は別の盤面を重ねる', () => {
    const base = new Grid(5, 5);
    const piece = Grid.fromStrings(['OO', 'OO']);
    base.stamp(piece, 1, 1);
    expect(base.population()).toBe(4);
    expect(base.get(1, 1)).toBe(1);
    expect(base.get(2, 2)).toBe(1);
  });

  it('randomize は同じ種から同じ結果を出す', () => {
    const a = new Grid(8, 8);
    const b = new Grid(8, 8);
    a.randomize(0.5, mulberry32(42));
    b.randomize(0.5, mulberry32(42));
    expect(a.equals(b)).toBe(true);
    const c = new Grid(8, 8);
    c.randomize(0.5, mulberry32(43));
    expect(a.equals(c)).toBe(false);
  });

  it('hash は内容が同じなら一致し、違えば変わる', () => {
    const a = Grid.fromStrings(['OO', 'O.']);
    const b = Grid.fromStrings(['OO', 'O.']);
    const c = Grid.fromStrings(['OO', '.O']);
    expect(a.hash()).toBe(b.hash());
    expect(a.hash()).not.toBe(c.hash());
  });
});
