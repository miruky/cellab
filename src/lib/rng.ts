// 盤面のランダム初期化と共有リンクの再現に使う決定論的な疑似乱数。
// 同じ種からは必ず同じ列が出るので、ランダムな初期配置をURLで共有しても再現できる。

export type Rng = () => number;

// mulberry32。32bitの状態から [0, 1) の値を返す軽量な生成器。
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
