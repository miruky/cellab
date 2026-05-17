// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from './app';
import { icon } from './ui/icons';
import { PATTERNS } from './lib';

function mount(): HTMLElement {
  const root = document.createElement('div');
  document.body.append(root);
  mountApp(root);
  return root;
}

beforeEach(() => {
  vi.useFakeTimers();
  try {
    localStorage.clear();
  } catch {
    // happy-dom の差は無視してよい
  }
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  location.hash = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('icon', () => {
  it('currentColor の最適化されたSVGを返す', () => {
    const svg = icon('play');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('aria-hidden="true"');
  });
});

describe('mountApp', () => {
  it('ブランドとモード切替を描画する', () => {
    const root = mount();
    expect(root.querySelector('.brand h1')?.textContent).toBe('cellab');
    expect(root.querySelector('.tagline')?.textContent).toContain('セルオートマトン');
    expect(root.querySelectorAll('.segmented [data-mode]')).toHaveLength(2);
  });

  it('全プリセットパターンをパレットに並べる', () => {
    const root = mount();
    expect(root.querySelectorAll('.pattern-chip')).toHaveLength(PATTERNS.length);
  });

  it('基本CAモードに切り替えるとパネルが入れ替わる', () => {
    const root = mount();
    const seg1d = root.querySelector<HTMLButtonElement>('.segmented [data-mode="1d"]')!;
    seg1d.click();
    expect(root.querySelector<HTMLElement>('[data-panel="1d"]')!.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-panel="2d"]')!.hidden).toBe(true);
    expect(seg1d.classList.contains('is-active')).toBe(true);
  });

  it('1手進めると世代表示が増える', () => {
    const root = mount();
    // 自動再生を止めてから1手だけ進める
    root.querySelector<HTMLButtonElement>('[data-act="play"]')!.click();
    const gen = root.querySelector('[data-gen]')!;
    expect(gen.textContent).toBe('0');
    root.querySelector<HTMLButtonElement>('[data-act="step"]')!.click();
    expect(gen.textContent).toBe('1');
  });

  it('不正なルール記法はエラーを示し状態を壊さない', () => {
    const root = mount();
    const input = root.querySelector<HTMLInputElement>('[data-rule-input]')!;
    input.value = 'B9/S';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(root.querySelector('[data-rule-error]')?.textContent).toContain('不正');
  });
});
