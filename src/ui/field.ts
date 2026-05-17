/**
 * 2次元盤を描くキャンバス。数千セルが毎フレーム更新されるため、図形ではなく
 * キャンバスへ直接描く。配色はCSSカスタムプロパティから読むのでテーマに追従する。
 * ポインタ位置からセル座標への変換は描画と切り離してあり、テストで直接確かめられる。
 */

import type { Grid } from '../lib';

export interface FieldGhost {
  /** プレビューするパターンの形。 */
  shape: Grid;
  /** 中心を置くセル座標。 */
  cx: number;
  cy: number;
}

export interface FieldView {
  grid: Grid;
  showGrid: boolean;
  ghost?: FieldGhost | null;
}

export type Tool = 'draw' | 'stamp';

export interface FieldHandlers {
  /** ドラッグ描画。value は 1(生)か 0(死)。 */
  onPaint(x: number, y: number, value: number): void;
  /** スタンプ配置。 */
  onStamp(x: number, y: number): void;
  /** マウス移動。スタンプのプレビュー位置に使う。 */
  onHover(x: number, y: number): void;
  onLeave(): void;
}

interface Colors {
  alive: string;
  grid: string;
  ghost: string;
}

function readColors(el: Element): Colors {
  const s = getComputedStyle(el);
  const pick = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    alive: pick('--cell', '#3b5bdb'),
    grid: pick('--cell-grid', '#d8dde6'),
    ghost: pick('--cell-ghost', 'rgba(59,91,219,0.4)'),
  };
}

export interface Field {
  readonly el: HTMLCanvasElement;
  setTool(tool: Tool): void;
  refreshColors(): void;
  render(view: FieldView): void;
  destroy(): void;
}

export function createField(handlers: FieldHandlers): Field {
  const canvas = document.createElement('canvas');
  canvas.className = 'field';

  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }

  let tool: Tool = 'draw';
  let cols = 1;
  let rows = 1;
  let current: Grid | null = null;
  let last: FieldView | null = null;
  let colors = readColors(canvas);

  // ポインタの画面座標を盤のセル座標へ。範囲外は端へ丸める。
  function cellAt(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const x = Math.floor(((clientX - rect.left) / w) * cols);
    const y = Math.floor(((clientY - rect.top) / h) * rows);
    return {
      x: Math.max(0, Math.min(cols - 1, x)),
      y: Math.max(0, Math.min(rows - 1, y)),
    };
  }

  let paintValue = 1;
  let painting = false;

  function onPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    ev.preventDefault();
    const { x, y } = cellAt(ev.clientX, ev.clientY);
    if (tool === 'stamp') {
      handlers.onStamp(x, y);
      return;
    }
    painting = true;
    // 最初に触れたセルの反転で塗る値を決め、ドラッグ中はその値で塗り続ける。
    paintValue = current && current.get(x, y) ? 0 : 1;
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {
      // 取得できなくても描画自体は続けられる
    }
    handlers.onPaint(x, y, paintValue);
  }

  function onPointerMove(ev: PointerEvent): void {
    const { x, y } = cellAt(ev.clientX, ev.clientY);
    if (painting) {
      handlers.onPaint(x, y, paintValue);
    } else {
      handlers.onHover(x, y);
    }
  }

  function endPaint(): void {
    painting = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);
  canvas.addEventListener('pointerleave', () => {
    if (!painting) handlers.onLeave();
  });

  function ensureSize(): void {
    if (!ctx) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || cols * 8;
    const cssH = rect.height || rows * 8;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paint(view: FieldView): void {
    last = view;
    current = view.grid;
    cols = view.grid.width;
    rows = view.grid.height;
    if (!ctx) return;
    ensureSize();
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || cols * 8;
    const cssH = rect.height || rows * 8;
    const cw = cssW / cols;
    const ch = cssH / rows;

    ctx.clearRect(0, 0, cssW, cssH);

    // 生きたセル。1pxの隙間を空けると密集しても粒が見える。
    ctx.fillStyle = colors.alive;
    const gap = cw > 6 && ch > 6 ? 1 : 0;
    const cells = view.grid.cells;
    for (let y = 0; y < rows; y++) {
      const base = y * cols;
      for (let x = 0; x < cols; x++) {
        if (cells[base + x]) {
          ctx.fillRect(x * cw + gap * 0.5, y * ch + gap * 0.5, cw - gap, ch - gap);
        }
      }
    }

    if (view.showGrid && cw > 5 && ch > 5) {
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (let x = 1; x < cols; x++) {
        ctx.moveTo(Math.round(x * cw) + 0.5, 0);
        ctx.lineTo(Math.round(x * cw) + 0.5, cssH);
      }
      for (let y = 1; y < rows; y++) {
        ctx.moveTo(0, Math.round(y * ch) + 0.5);
        ctx.lineTo(cssW, Math.round(y * ch) + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const ghost = view.ghost;
    if (ghost) {
      ctx.fillStyle = colors.ghost;
      const ox = ghost.cx - (ghost.shape.width >> 1);
      const oy = ghost.cy - (ghost.shape.height >> 1);
      for (let y = 0; y < ghost.shape.height; y++) {
        for (let x = 0; x < ghost.shape.width; x++) {
          if (ghost.shape.get(x, y)) {
            ctx.fillRect((ox + x) * cw + gap * 0.5, (oy + y) * ch + gap * 0.5, cw - gap, ch - gap);
          }
        }
      }
    }
  }

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (last) paint(last);
    });
    resizeObserver.observe(canvas);
  }

  return {
    el: canvas,
    setTool(next) {
      tool = next;
    },
    refreshColors() {
      colors = readColors(canvas);
      if (last) paint(last);
    },
    render(view) {
      paint(view);
    },
    destroy() {
      resizeObserver?.disconnect();
    },
  };
}
