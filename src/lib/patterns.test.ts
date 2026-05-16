import { describe, expect, it } from 'vitest';
import { classify } from './analysis';
import { Grid } from './grid';
import { step } from './life';
import { findPattern, patternGrid, PATTERNS } from './patterns';
import { parseRule } from './rule';

const conway = parseRule('B3/S23');

// 生きたセルの形を矩形相対の文字列にする。位置に依らず形だけ比較するため。
function shape(grid: Grid): string {
  const box = grid.boundingBox();
  if (!box) return '';
  let out = '';
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) out += grid.get(x, y) ? 'O' : '.';
    out += '/';
  }
  return out;
}

function place(pattern: string, margin: number): Grid {
  const p = patternGrid(findPattern(pattern)!);
  const g = new Grid(p.width + margin * 2, p.height + margin * 2);
  g.stamp(p, margin, margin);
  return g;
}

describe('既定パターン', () => {
  it('すべて解析でき、生きたセルを持つ', () => {
    for (const pattern of PATTERNS) {
      const grid = patternGrid(pattern);
      expect(grid.population(), pattern.id).toBeGreaterThan(0);
    }
  });

  it('静物は周期1で安定する', () => {
    for (const id of ['block', 'beehive', 'loaf', 'boat']) {
      const result = classify(place(id, 3), conway, 'bounded');
      expect(result, id).toEqual({ kind: 'still', period: 1 });
    }
  });

  it('振動子は既知の周期を持つ', () => {
    const expected: Record<string, number> = { blinker: 2, toad: 2, beacon: 2, pulsar: 3 };
    for (const [id, period] of Object.entries(expected)) {
      const result = classify(place(id, 4), conway, 'bounded');
      expect(result, id).toEqual({ kind: 'oscillator', period });
    }
  });

  it('グライダーは4世代で形を保ったまま斜めに1マス進む', () => {
    let g = place('glider', 20);
    const before = g.boundingBox()!;
    const beforeShape = shape(g);
    for (let i = 0; i < 4; i++) g = step(g, conway, 'bounded');
    const after = g.boundingBox()!;
    expect(shape(g)).toBe(beforeShape);
    expect(after.minX - before.minX).toBe(1);
    expect(after.minY - before.minY).toBe(1);
  });

  it('軽量級宇宙船は4世代で形を保ったまま水平に2マス進む', () => {
    let g = place('lwss', 20);
    const before = g.boundingBox()!;
    const beforeShape = shape(g);
    for (let i = 0; i < 4; i++) g = step(g, conway, 'bounded');
    const after = g.boundingBox()!;
    expect(shape(g)).toBe(beforeShape);
    expect(Math.abs(after.minX - before.minX)).toBe(2);
    expect(after.minY - before.minY).toBe(0);
  });

  it('ゴスパー銃は個体数が増え続ける (無限成長)', () => {
    let g = place('gosper-gun', 20);
    const start = g.population();
    for (let i = 0; i < 60; i++) g = step(g, conway, 'bounded');
    expect(g.population()).toBeGreaterThan(start);
  });

  it('ダイハードは130世代でちょうど消滅する', () => {
    // diehardは無限平面で130世代後に消える長寿型。盤の端に触れると挙動が
    // 変わるため、十分広い盤に置く。129世代では生きていることも確かめる。
    let g = place('diehard', 40);
    for (let i = 0; i < 129; i++) g = step(g, conway, 'bounded');
    expect(g.population()).toBeGreaterThan(0);
    g = step(g, conway, 'bounded');
    expect(g.population()).toBe(0);
  });
});
