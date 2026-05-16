import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Lab } from './lab';
import { findPattern, type Pattern } from './lib';

const blinker = findPattern('blinker') as Pattern;
const block = findPattern('block') as Pattern;

describe('Lab(2次元)', () => {
  let lab: Lab;
  beforeEach(() => {
    lab = new Lab({ cols: 32, rows: 24, historyRows: 40 });
  });

  it('既定はConwayルール・トーラス・2次元', () => {
    expect(lab.mode).toBe('2d');
    expect(lab.ruleText).toBe('B3/S23');
    expect(lab.topology).toBe('torus');
    expect(lab.population()).toBe(0);
  });

  it('点滅器は周期2で振動し、個体数を保つ', () => {
    lab.stampPattern(blinker, 16, 12);
    expect(lab.population()).toBe(3);
    lab.step();
    expect(lab.generation).toBe(1);
    expect(lab.population()).toBe(3);
    lab.step();
    expect(lab.population()).toBe(3);
  });

  it('静物(ブロック)は変化しない', () => {
    lab.stampPattern(block, 10, 10);
    const before = lab.grid.clone();
    lab.step();
    expect(lab.grid.equals(before)).toBe(true);
  });

  it('描き込みと消去', () => {
    lab.toggleCell(5, 5);
    expect(lab.grid.get(5, 5)).toBe(1);
    lab.paintCell(5, 5, 0);
    expect(lab.grid.get(5, 5)).toBe(0);
    lab.toggleCell(1, 1);
    lab.clear();
    expect(lab.population()).toBe(0);
  });

  it('同じシードからは同じ盤ができる', () => {
    const a = new Lab({ cols: 20, rows: 20, historyRows: 10 });
    const b = new Lab({ cols: 20, rows: 20, historyRows: 10 });
    a.randomize(0.5, 12345);
    b.randomize(0.5, 12345);
    expect(a.grid.equals(b.grid)).toBe(true);
  });

  it('ルールは正規化され、不正な記法は例外', () => {
    lab.setRule('s23/b3');
    expect(lab.ruleText).toBe('B3/S23');
    expect(() => lab.setRule('B9/S')).toThrow();
    // 例外時も状態は壊れない
    expect(lab.ruleText).toBe('B3/S23');
  });

  it('解析が静物・振動子・消滅を見分ける', () => {
    lab.stampPattern(block, 10, 10);
    expect(lab.classify()).toEqual({ kind: 'still', period: 1 });
    lab.clear();
    lab.stampPattern(blinker, 16, 12);
    expect(lab.classify()).toEqual({ kind: 'oscillator', period: 2 });
    lab.clear();
    expect(lab.classify().kind).toBe('extinct');
  });

  it('変更を購読できる', () => {
    const fn = vi.fn();
    const off = lab.onChange(fn);
    lab.step();
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    lab.step();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('Lab(1次元)', () => {
  let lab: Lab;
  beforeEach(() => {
    lab = new Lab({ cols: 33, rows: 24, historyRows: 8 });
    lab.setMode('1d');
  });

  it('種は1行で、ステップごとに行が増える', () => {
    expect(lab.history).toHaveLength(1);
    expect(lab.population()).toBe(1); // 中央1点
    lab.step();
    expect(lab.history).toHaveLength(2);
    expect(lab.generation).toBe(1);
  });

  it('履歴は容量を超えると古い行から流れる', () => {
    for (let i = 0; i < 20; i++) lab.step();
    expect(lab.history.length).toBeLessThanOrEqual(8);
  });

  it('ルール番号は範囲を検証し、変更で初期化される', () => {
    lab.step();
    lab.step();
    lab.setElementaryRule(90);
    expect(lab.elementaryRule).toBe(90);
    expect(lab.history).toHaveLength(1);
    expect(() => lab.setElementaryRule(300)).toThrow();
  });

  it('ルール90はシェルピンスキー三角形の左右対称を保つ', () => {
    lab.setElementaryRule(90);
    for (let i = 0; i < 6; i++) lab.step();
    for (const row of lab.history) {
      for (let x = 0; x < 33; x++) {
        expect(row[x]).toBe(row[33 - 1 - x]);
      }
    }
  });
});

describe('Lab 共有の往復', () => {
  it('2次元の状態を保存して復元できる', () => {
    const lab = new Lab({ cols: 24, rows: 18, historyRows: 10 });
    lab.setRule('B36/S23');
    lab.setTopology('bounded');
    lab.toggleCell(3, 4);
    lab.toggleCell(7, 9);
    const state = lab.toState();

    const restored = new Lab({ cols: 24, rows: 18, historyRows: 10 });
    restored.loadState(state);
    expect(restored.mode).toBe('2d');
    expect(restored.ruleText).toBe('B36/S23');
    expect(restored.topology).toBe('bounded');
    expect(restored.grid.get(3, 4)).toBe(1);
    expect(restored.grid.get(7, 9)).toBe(1);
  });

  it('1次元の状態を保存して復元できる', () => {
    const lab = new Lab();
    lab.setMode('1d');
    lab.setElementaryRule(110);
    lab.setSeed('random', 42);
    const restored = new Lab();
    restored.loadState(lab.toState());
    expect(restored.mode).toBe('1d');
    expect(restored.elementaryRule).toBe(110);
    expect(restored.seedKind).toBe('random');
    expect(restored.seedValue).toBe(42);
  });
});
