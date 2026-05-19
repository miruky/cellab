/**
 * 実験場の状態を一手に持つ制御役。2次元のライフ系オートマトンと、1次元の基本CA
 * (Wolframのルール0〜255)を同じ器で扱い、世代を進める・描き込む・乱数で撒く・
 * パターンを置く・解析する、をまとめる。描画層(src/ui)はこの状態を読むだけで、
 * ここはDOMに一切触れない。変更は購読者へ通知し、URLとの相互変換も担う。
 */

import {
  Grid,
  mulberry32,
  parseRule,
  parseRle,
  formatRule,
  step as stepLife,
  type Rule,
  type Topology,
  stepElementaryRow,
  centeredRow,
  randomRow,
  classify as classifyGrid,
  type Classification,
  patternGrid,
  type Pattern,
  type LabState,
  type SeedKind,
} from './lib';

export type Mode = '2d' | '1d';

export interface LabConfig {
  /** 2次元盤の列数、および1次元の1行のセル数。 */
  cols: number;
  /** 2次元盤の行数。 */
  rows: number;
  /** 1次元の時空図に残す世代数(超えた分は上から流れて消える)。 */
  historyRows: number;
}

export const DEFAULT_CONFIG: LabConfig = { cols: 64, rows: 48, historyRows: 96 };

// 「1世代戻る」ために保持する直前の状態。2次元は盤の写し、1次元は時空図の写しを持つ。
interface PastFrame {
  grid?: Grid;
  rows?: Uint8Array[];
  generation: number;
}

// 戻れる世代数の上限。盤の写しを溜めるのでメモリと相談してこの辺に切る。
const MAX_PAST = 120;

// 1次元の初期行を種から作る。乱数はシードで再現できるようにしてある。
function makeSeedRow(width: number, kind: SeedKind, seed: number): Uint8Array {
  return kind === 'random' ? randomRow(width, 0.5, mulberry32(seed)) : centeredRow(width);
}

export class Lab {
  readonly config: LabConfig;

  mode: Mode = '2d';

  // 2次元の状態
  grid: Grid;
  rule: Rule;
  ruleText: string;
  topology: Topology = 'torus';

  // 1次元の状態
  elementaryRule = 30;
  wrap1d = true;
  seedKind: SeedKind = 'center';
  seedValue = 1;
  history: Uint8Array[] = [];

  generation = 0;

  private past: PastFrame[] = [];

  private listeners = new Set<() => void>();

  constructor(config: LabConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.grid = new Grid(config.cols, config.rows);
    this.ruleText = 'B3/S23';
    this.rule = parseRule(this.ruleText);
    this.resetElementary();
  }

  // ---- 購読 ----

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  // ---- 共通操作 ----

  setMode(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.generation = 0;
    this.past = [];
    if (mode === '1d') this.resetElementary();
    this.emit();
  }

  // 戻る用に今の状態を控える。古い分は上限を超えたら捨てる。
  private record(): void {
    const frame: PastFrame =
      this.mode === '2d'
        ? { grid: this.grid.clone(), generation: this.generation }
        : { rows: this.history.map((r) => r.slice()), generation: this.generation };
    this.past.push(frame);
    if (this.past.length > MAX_PAST) this.past.shift();
  }

  step(): void {
    if (this.mode === '2d') {
      this.record();
      this.grid = stepLife(this.grid, this.rule, this.topology);
    } else {
      const last = this.history[this.history.length - 1];
      if (!last) return;
      this.record();
      const next = stepElementaryRow(last, this.elementaryRule, this.wrap1d);
      this.history.push(next);
      if (this.history.length > this.config.historyRows) this.history.shift();
    }
    this.generation++;
    this.emit();
  }

  /** 直前の世代へ戻れるか。 */
  canBack(): boolean {
    return this.past.length > 0;
  }

  /** 1世代戻す。控えが無ければ何もしない。手で描いた変更は戻すと失われる。 */
  back(): void {
    const frame = this.past.pop();
    if (!frame) return;
    if (frame.grid) this.grid = frame.grid;
    if (frame.rows) this.history = frame.rows;
    this.generation = frame.generation;
    this.emit();
  }

  /** 現在のモードを初期状態へ戻す。2次元は盤を空に、1次元は種の行だけにする。 */
  clear(): void {
    if (this.mode === '2d') {
      this.grid = new Grid(this.config.cols, this.config.rows);
    } else {
      this.resetElementary();
    }
    this.generation = 0;
    this.past = [];
    this.emit();
  }

  population(): number {
    if (this.mode === '2d') return this.grid.population();
    let n = 0;
    for (const row of this.history) for (const c of row) n += c;
    return n;
  }

  // ---- 2次元の操作 ----

  setRule(text: string): void {
    // 不正な記法は呼び出し側で握って画面に出す。状態は壊さない。
    const rule = parseRule(text);
    this.rule = rule;
    this.ruleText = formatRule(rule);
    this.emit();
  }

  setTopology(topology: Topology): void {
    if (this.topology === topology) return;
    this.topology = topology;
    this.emit();
  }

  toggleCell(x: number, y: number): void {
    this.grid.toggle(x, y);
    this.emit();
  }

  paintCell(x: number, y: number, value: number): void {
    if (this.grid.get(x, y) === value) return;
    this.grid.set(x, y, value);
    this.emit();
  }

  randomize(density = 0.32, seed = (Math.random() * 0xffffffff) >>> 0): void {
    this.grid.randomize(density, mulberry32(seed));
    this.generation = 0;
    this.past = [];
    this.emit();
  }

  /**
   * RLE文字列を取り込んで2次元の盤に中央寄せで載せる。ルールが書かれていれば適用する。
   * 不正な文字列のときは parseRle が投げるので、呼び出し側で握って画面に出す。
   */
  importRle(text: string): { name?: string } {
    const parsed = parseRle(text);
    this.mode = '2d';
    if (parsed.rule) {
      this.rule = parsed.rule;
      this.ruleText = formatRule(parsed.rule);
    }
    const grid = new Grid(this.config.cols, this.config.rows);
    const ox = Math.floor((this.config.cols - parsed.grid.width) / 2);
    const oy = Math.floor((this.config.rows - parsed.grid.height) / 2);
    grid.stamp(parsed.grid, ox, oy, 'set');
    this.grid = grid;
    this.generation = 0;
    this.past = [];
    this.emit();
    return { name: parsed.name };
  }

  /** パターンを (cx, cy) を中心に置く。盤からはみ出す分は切り捨てられる。 */
  stampPattern(pattern: Pattern, cx: number, cy: number): void {
    const p = patternGrid(pattern);
    this.grid.stamp(p, cx - (p.width >> 1), cy - (p.height >> 1), 'or');
    this.emit();
  }

  classify(maxPeriod = 30): Classification {
    return classifyGrid(this.grid, this.rule, this.topology, maxPeriod);
  }

  // ---- 1次元の操作 ----

  setElementaryRule(n: number): void {
    const r = Math.trunc(n);
    if (!Number.isFinite(r) || r < 0 || r > 255) throw new RangeError('ルールは0〜255です');
    this.elementaryRule = r;
    this.resetElementary();
    this.emit();
  }

  setSeed(kind: SeedKind, value = this.seedValue): void {
    this.seedKind = kind;
    this.seedValue = value >>> 0;
    this.resetElementary();
    this.emit();
  }

  setWrap1d(wrap: boolean): void {
    this.wrap1d = wrap;
    this.resetElementary();
    this.emit();
  }

  resetElementary(): void {
    this.history = [makeSeedRow(this.config.cols, this.seedKind, this.seedValue)];
    this.generation = 0;
    this.past = [];
  }

  // ---- 共有 ----

  toState(): LabState {
    if (this.mode === '2d') {
      return { mode: '2d', rule: this.ruleText, topology: this.topology, grid: this.grid.clone() };
    }
    return {
      mode: '1d',
      rule: this.elementaryRule,
      seed: this.seedKind,
      seedValue: this.seedValue,
    };
  }

  loadState(state: LabState): void {
    if (state.mode === '2d') {
      this.mode = '2d';
      this.setRule(state.rule);
      this.topology = state.topology;
      // 共有された盤の大きさが器と違うこともあるので、左上を合わせて取り込む。
      const grid = new Grid(this.config.cols, this.config.rows);
      grid.stamp(state.grid, 0, 0, 'set');
      this.grid = grid;
    } else {
      this.mode = '1d';
      this.elementaryRule = state.rule;
      this.seedKind = state.seed;
      this.seedValue = state.seedValue;
      this.resetElementary();
    }
    this.generation = 0;
    this.past = [];
    this.emit();
  }
}
