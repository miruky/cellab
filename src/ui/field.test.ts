// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createField, type FieldHandlers } from './field';
import { Grid } from '../lib';

function rectOf(el: HTMLElement, size: number): void {
  el.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: size,
      height: size,
      right: size,
      bottom: size,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function noop(over: Partial<FieldHandlers> = {}): FieldHandlers {
  return { onPaint() {}, onStamp() {}, onHover() {}, onLeave() {}, ...over };
}

describe('createField', () => {
  it('classが field のキャンバスを返し、描画で落ちない', () => {
    const field = createField(noop());
    document.body.append(field.el);
    const g = new Grid(10, 10);
    g.set(1, 1, 1);
    expect(() => field.render({ grid: g, showGrid: true })).not.toThrow();
    expect(field.el.tagName).toBe('CANVAS');
    expect(field.el.classList.contains('field')).toBe(true);
  });

  it('クリック位置を正しいセルに写し、空マスは生(1)で塗る', () => {
    let painted: { x: number; y: number; v: number } | null = null;
    const field = createField(noop({ onPaint: (x, y, v) => (painted = { x, y, v }) }));
    field.render({ grid: new Grid(10, 10), showGrid: false });
    rectOf(field.el, 200);
    document.body.append(field.el);
    field.el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 30, clientY: 50, bubbles: true }));
    // 30/200*10 = 1列、50/200*10 = 2行
    expect(painted).toEqual({ x: 1, y: 2, v: 1 });
  });

  it('生きたマスを起点にすると死(0)で塗る', () => {
    let painted: { x: number; y: number; v: number } | null = null;
    const field = createField(noop({ onPaint: (x, y, v) => (painted = { x, y, v }) }));
    const g = new Grid(10, 10);
    g.set(1, 2, 1);
    field.render({ grid: g, showGrid: false });
    rectOf(field.el, 200);
    document.body.append(field.el);
    field.el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 30, clientY: 50, bubbles: true }));
    expect(painted).toEqual({ x: 1, y: 2, v: 0 });
  });

  it('スタンプツールではクリックで onStamp を呼ぶ', () => {
    let stamped: { x: number; y: number } | null = null;
    const field = createField(noop({ onStamp: (x, y) => (stamped = { x, y }) }));
    field.render({ grid: new Grid(8, 8), showGrid: false });
    field.setTool('stamp');
    rectOf(field.el, 160);
    document.body.append(field.el);
    field.el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 20, bubbles: true }));
    // 100/160*8 = 5列、20/160*8 = 1行
    expect(stamped).toEqual({ x: 5, y: 1 });
  });

  it('ボタンを押さない移動は onHover を呼ぶ', () => {
    let hovered: { x: number; y: number } | null = null;
    const field = createField(noop({ onHover: (x, y) => (hovered = { x, y }) }));
    field.render({ grid: new Grid(10, 10), showGrid: false });
    rectOf(field.el, 100);
    document.body.append(field.el);
    field.el.dispatchEvent(new MouseEvent('pointermove', { clientX: 55, clientY: 5, bubbles: true }));
    expect(hovered).toEqual({ x: 5, y: 0 });
  });
});
