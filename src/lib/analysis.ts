import { Grid } from './grid';
import { step, type Topology } from './life';
import type { Rule } from './rule';

export type StateKind = 'still' | 'oscillator' | 'extinct' | 'unknown';

export interface Classification {
  kind: StateKind;
  // still は1、oscillator はその周期。それ以外は未定義。
  period?: number;
}

// 盤面が静物・振動子・消滅のいずれに落ち着いたかを maxPeriod 世代まで調べる。
// 元の盤面と一致する世代が見つかればその周期、見つからなければ unknown。
export function classify(
  grid: Grid,
  rule: Rule,
  topology: Topology,
  maxPeriod = 30,
): Classification {
  if (grid.population() === 0) return { kind: 'extinct' };
  let current = grid;
  for (let p = 1; p <= maxPeriod; p++) {
    current = step(current, rule, topology);
    if (current.population() === 0) return { kind: 'extinct' };
    if (current.equals(grid)) {
      return p === 1 ? { kind: 'still', period: 1 } : { kind: 'oscillator', period: p };
    }
  }
  return { kind: 'unknown' };
}
