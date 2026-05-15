import { describe, expect, it } from 'vitest';
import { Grid } from './grid';
import { countNeighbors, step } from './life';
import { parseRule } from './rule';

const conway = parseRule('B3/S23');

describe('countNeighbors', () => {
  it('bounded は盤外を死とみなす', () => {
    const g = Grid.fromStrings(['O..', '...', '..O']);
    expect(countNeighbors(g, 1, 1, 'bounded')).toBe(2);
    expect(countNeighbors(g, 0, 0, 'bounded')).toBe(0);
  });

  it('torus は端で反対側を参照する', () => {
    const g = Grid.fromStrings(['...', '...', '..O']);
    // 角(0,0)の対角は torus で (2,2) につながる
    expect(countNeighbors(g, 0, 0, 'torus')).toBe(1);
    expect(countNeighbors(g, 0, 0, 'bounded')).toBe(0);
  });
});

describe('step', () => {
  it('点滅器は水平から垂直へ変わる (B3/S23)', () => {
    const before = Grid.fromStrings(['.....', '.....', '.OOO.', '.....', '.....']);
    const after = step(before, conway, 'bounded');
    const expected = Grid.fromStrings(['.....', '..O..', '..O..', '..O..', '.....']);
    expect(after.equals(expected)).toBe(true);
  });

  it('元の盤面を書き換えない', () => {
    const before = Grid.fromStrings(['.OOO.']);
    const snapshot = before.clone();
    step(before, conway, 'bounded');
    expect(before.equals(snapshot)).toBe(true);
  });

  it('孤立した1セルは次世代で消える', () => {
    const g = Grid.fromStrings(['...', '.O.', '...']);
    expect(step(g, conway, 'bounded').population()).toBe(0);
  });

  it('ブロックは静物として保たれる', () => {
    const block = Grid.fromStrings(['....', '.OO.', '.OO.', '....']);
    expect(step(block, conway, 'bounded').equals(block)).toBe(true);
  });
});
