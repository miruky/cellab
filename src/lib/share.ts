import { Grid } from './grid';
import type { Topology } from './life';

// 実験の状態をURLのフラグメントに載せるための可逆な符号化。
// 2次元は ルール・トポロジー・盤面 を、1次元は ルール・初期化方法 を保存する。
// 盤面はセル列の連長符号にするので、まばらな盤面なら短い文字列で共有できる。

export type SeedKind = 'center' | 'random';

export interface State2D {
  mode: '2d';
  rule: string;
  topology: Topology;
  grid: Grid;
}

export interface State1D {
  mode: '1d';
  rule: number;
  seed: SeedKind;
  seedValue: number;
}

export type LabState = State2D | State1D;

// セル列を「0の連長から始まる連長」に変換する (区切りはドット)。
function encodeRuns(cells: Uint8Array): string {
  const runs: number[] = [];
  let value = 0;
  let length = 0;
  for (let i = 0; i < cells.length; i++) {
    const v = cells[i] ?? 0;
    if (v === value) {
      length++;
    } else {
      runs.push(length);
      value = v;
      length = 1;
    }
  }
  runs.push(length);
  return runs.join('.');
}

function decodeRuns(text: string, total: number): Uint8Array {
  const cells = new Uint8Array(total);
  if (text === '') return cells;
  let i = 0;
  let value = 0;
  for (const token of text.split('.')) {
    const length = Number(token) || 0;
    if (value === 1) {
      for (let k = 0; k < length && i < total; k++) cells[i++] = 1;
    } else {
      i += length;
    }
    value = value === 0 ? 1 : 0;
  }
  return cells;
}

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.trunc(n)));
}

export function encodeState(state: LabState): string {
  if (state.mode === '2d') {
    const { grid } = state;
    return ['2d', state.rule, state.topology, grid.width, grid.height, encodeRuns(grid.cells)].join(
      '~',
    );
  }
  return ['1d', state.rule, state.seed === 'random' ? 'r' : 'c', state.seedValue].join('~');
}

export function decodeState(text: string): LabState {
  const parts = text.split('~');
  if (parts[0] === '2d') {
    if (parts.length < 6) throw new Error('共有データ(2d)が不正です');
    const rule = parts[1] || 'B3/S23';
    const topology: Topology = parts[2] === 'bounded' ? 'bounded' : 'torus';
    const width = Number(parts[3]);
    const height = Number(parts[4]);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new Error('共有データ(2d)の盤面サイズが不正です');
    }
    const cells = decodeRuns(parts[5] ?? '', width * height);
    return { mode: '2d', rule, topology, grid: new Grid(width, height, cells) };
  }
  if (parts[0] === '1d') {
    return {
      mode: '1d',
      rule: clampByte(Number(parts[1])),
      seed: parts[2] === 'r' ? 'random' : 'center',
      seedValue: Math.trunc(Number(parts[3] ?? '0')) || 0,
    };
  }
  throw new Error('未知の共有データです');
}
