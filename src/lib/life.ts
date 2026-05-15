import { Grid } from './grid';
import type { Rule } from './rule';

// torus は上下左右がつながった輪環。bounded は外側を死んだセルとみなす有限盤。
export type Topology = 'torus' | 'bounded';

function countTorus(grid: Grid, x: number, y: number): number {
  const { width: w, height: h, cells } = grid;
  const xm = (x - 1 + w) % w;
  const xp = (x + 1) % w;
  const r0 = ((y - 1 + h) % h) * w;
  const r1 = y * w;
  const r2 = ((y + 1) % h) * w;
  return (
    (cells[r0 + xm] ?? 0) +
    (cells[r0 + x] ?? 0) +
    (cells[r0 + xp] ?? 0) +
    (cells[r1 + xm] ?? 0) +
    (cells[r1 + xp] ?? 0) +
    (cells[r2 + xm] ?? 0) +
    (cells[r2 + x] ?? 0) +
    (cells[r2 + xp] ?? 0)
  );
}

function countBounded(grid: Grid, x: number, y: number): number {
  const { width: w, height: h, cells } = grid;
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= h) continue;
    const row = ny * w;
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      if (nx < 0 || nx >= w) continue;
      n += cells[row + nx] ?? 0;
    }
  }
  return n;
}

// マス目 (x, y) のムーア近傍 (周囲8マス) の生存数。
export function countNeighbors(grid: Grid, x: number, y: number, topology: Topology): number {
  return topology === 'torus' ? countTorus(grid, x, y) : countBounded(grid, x, y);
}

// ルールを1世代分適用した新しい盤面を返す。元の盤面は変更しない。
export function step(grid: Grid, rule: Rule, topology: Topology = 'torus'): Grid {
  const w = grid.width;
  const h = grid.height;
  const src = grid.cells;
  const next = new Grid(w, h);
  const dst = next.cells;
  const torus = topology === 'torus';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = torus ? countTorus(grid, x, y) : countBounded(grid, x, y);
      const i = y * w + x;
      const alive = (src[i] ?? 0) !== 0;
      if (alive ? rule.survival.has(n) : rule.birth.has(n)) dst[i] = 1;
    }
  }
  return next;
}
