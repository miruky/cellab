/**
 * 1次元の基本CAの時空図。各世代を1本の横列として上から下へ積む。種が画面上端に
 * とどまる間は例の三角模様が育ち、履歴が埋まると上から流れていく。表示専用。
 */

function readAlive(el: Element): string {
  const v = getComputedStyle(el).getPropertyValue('--cell').trim();
  return v || '#3b5bdb';
}

export interface Diagram {
  readonly el: HTMLCanvasElement;
  refreshColors(): void;
  render(rows: Uint8Array[], width: number, capacity: number): void;
  destroy(): void;
}

export function createDiagram(): Diagram {
  const canvas = document.createElement('canvas');
  canvas.className = 'diagram';

  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }

  let alive = readAlive(canvas);
  let lastRows: Uint8Array[] = [];
  let lastWidth = 1;
  let lastCapacity = 1;

  function paint(rows: Uint8Array[], width: number, capacity: number): void {
    lastRows = rows;
    lastWidth = width;
    lastCapacity = capacity;
    if (!ctx) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || width * 6;
    const cssH = rect.height || capacity * 6;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const cw = cssW / width;
    const ch = cssH / capacity;
    ctx.fillStyle = alive;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const y = r * ch;
      for (let x = 0; x < width; x++) {
        if (row[x]) ctx.fillRect(x * cw, y, Math.ceil(cw), Math.ceil(ch));
      }
    }
  }

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => paint(lastRows, lastWidth, lastCapacity));
    resizeObserver.observe(canvas);
  }

  return {
    el: canvas,
    refreshColors() {
      alive = readAlive(canvas);
      paint(lastRows, lastWidth, lastCapacity);
    },
    render(rows, width, capacity) {
      paint(rows, width, capacity);
    },
    destroy() {
      resizeObserver?.disconnect();
    },
  };
}
