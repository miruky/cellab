import type { Rng } from './rng';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type StampMode = 'or' | 'set';

// 2次元セルオートマトンの盤面。セルは 0/1 を詰めた Uint8Array で、行優先で並ぶ。
// 範囲外アクセスは get が 0 を返し set が無視するので、描画側で端を気にせず扱える。
export class Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;

  constructor(width: number, height: number, cells?: Uint8Array) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new RangeError(`盤面の大きさが不正です: ${width}x${height}`);
    }
    this.width = width;
    this.height = height;
    if (cells) {
      if (cells.length !== width * height) {
        throw new RangeError(`cellsの長さ ${cells.length} が ${width}x${height} と一致しません`);
      }
      this.cells = cells;
    } else {
      this.cells = new Uint8Array(width * height);
    }
  }

  // 文字の行配列から盤面を作る。テストや既定パターンを読みやすく書くための補助。
  static fromStrings(rows: string[], alive = 'O'): Grid {
    if (rows.length === 0) throw new RangeError('行が空です');
    const width = Math.max(...rows.map((r) => r.length));
    const grid = new Grid(width, rows.length);
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y] ?? '';
      for (let x = 0; x < row.length; x++) {
        if (row[x] === alive) grid.set(x, y, 1);
      }
    }
    return grid;
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    return this.cells[this.index(x, y)] ?? 0;
  }

  set(x: number, y: number, value: number): void {
    if (!this.inBounds(x, y)) return;
    this.cells[this.index(x, y)] = value ? 1 : 0;
  }

  toggle(x: number, y: number): void {
    if (!this.inBounds(x, y)) return;
    const i = this.index(x, y);
    this.cells[i] = this.cells[i] ? 0 : 1;
  }

  clear(): void {
    this.cells.fill(0);
  }

  clone(): Grid {
    return new Grid(this.width, this.height, this.cells.slice());
  }

  population(): number {
    let n = 0;
    const c = this.cells;
    for (let i = 0; i < c.length; i++) n += c[i] ?? 0;
    return n;
  }

  equals(other: Grid): boolean {
    if (this.width !== other.width || this.height !== other.height) return false;
    const a = this.cells;
    const b = other.cells;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // 生きたセルを囲む最小の矩形。すべて死んでいれば null。
  boundingBox(): BoundingBox | null {
    let minX = this.width;
    let minY = this.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if ((this.cells[this.index(x, y)] ?? 0) !== 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { minX, minY, maxX, maxY };
  }

  randomize(density: number, rng: Rng): void {
    const c = this.cells;
    for (let i = 0; i < c.length; i++) c[i] = rng() < density ? 1 : 0;
  }

  // 別の盤面を (ox, oy) を左上として書き込む。or は重ね、set は置き換え。
  stamp(pattern: Grid, ox: number, oy: number, mode: StampMode = 'or'): void {
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const v = pattern.get(x, y);
        if (mode === 'or') {
          if (v) this.set(ox + x, oy + y, 1);
        } else {
          this.set(ox + x, oy + y, v);
        }
      }
    }
  }

  // 内容と大きさから決まる安定したハッシュ。周期検出の高速な前段に使う (FNV-1a)。
  hash(): number {
    let h = 0x811c9dc5;
    h = Math.imul(h ^ this.width, 0x01000193);
    h = Math.imul(h ^ this.height, 0x01000193);
    const c = this.cells;
    for (let i = 0; i < c.length; i++) {
      h = Math.imul(h ^ (c[i] ?? 0), 0x01000193);
    }
    return h >>> 0;
  }
}
