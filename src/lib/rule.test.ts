import { describe, expect, it } from 'vitest';
import { formatRule, parseRule } from './rule';

describe('parseRule', () => {
  it('B/S記法を解析する', () => {
    const r = parseRule('B3/S23');
    expect([...r.birth].sort()).toEqual([3]);
    expect([...r.survival].sort()).toEqual([2, 3]);
  });

  it('順不同 (S.../B...) も受け付ける', () => {
    const r = parseRule('S23/B3');
    expect(formatRule(r)).toBe('B3/S23');
  });

  it('小文字や空白を許容する', () => {
    expect(formatRule(parseRule(' b3 / s23 '))).toBe('B3/S23');
  });

  it('文字なしは生存/誕生記法とみなす', () => {
    expect(formatRule(parseRule('23/3'))).toBe('B3/S23');
  });

  it('片方が空のルール (Seeds) を扱える', () => {
    const r = parseRule('B2/S');
    expect([...r.birth]).toEqual([2]);
    expect(r.survival.size).toBe(0);
    expect(formatRule(r)).toBe('B2/S');
  });

  it('近傍数が9以上や不正な形式は例外', () => {
    expect(() => parseRule('B9/S2')).toThrow();
    expect(() => parseRule('B3S23')).toThrow();
    expect(() => parseRule('')).toThrow();
    expect(() => parseRule('B3/S2/3')).toThrow();
  });
});

describe('formatRule', () => {
  it('近傍数を昇順に並べた正規形を返す', () => {
    expect(formatRule({ birth: new Set([6, 3]), survival: new Set([3, 2]) })).toBe('B36/S23');
  });
});
