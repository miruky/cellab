import { describe, expect, it } from 'vitest';
import { Lab } from './lab';
import { encodeHash, parseHash, shareUrl } from './share';

describe('共有ハッシュ', () => {
  it('2次元の盤を往復できる', () => {
    const lab = new Lab({ cols: 20, rows: 16, historyRows: 10 });
    lab.setRule('B3/S23');
    lab.toggleCell(2, 3);
    lab.toggleCell(10, 8);
    const hash = encodeHash(lab.toState());
    expect(hash.startsWith('#')).toBe(true);

    const decoded = parseHash(hash);
    expect(decoded?.mode).toBe('2d');
    if (decoded?.mode === '2d') {
      expect(decoded.grid.get(2, 3)).toBe(1);
      expect(decoded.grid.get(10, 8)).toBe(1);
      expect(decoded.rule).toBe('B3/S23');
    }
  });

  it('1次元の設定を往復できる', () => {
    const lab = new Lab();
    lab.setMode('1d');
    lab.setElementaryRule(90);
    lab.setSeed('random', 7);
    const decoded = parseHash(encodeHash(lab.toState()));
    expect(decoded).toEqual({ mode: '1d', rule: 90, seed: 'random', seedValue: 7 });
  });

  it('空や壊れたハッシュは null', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#')).toBeNull();
    expect(parseHash('#こわれている')).toBeNull();
  });

  it('共有URLは既存のハッシュを置き換える', () => {
    const lab = new Lab();
    lab.setMode('1d');
    const url = shareUrl('https://example.com/cellab/#old', lab.toState());
    expect(url.startsWith('https://example.com/cellab/#')).toBe(true);
    expect(url).not.toContain('#old');
  });
});
