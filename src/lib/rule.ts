// ライフ系セルオートマトンのルールを B/S 記法で表す。
// B のあとの数字は誕生する近傍数、S のあとの数字は生存する近傍数。
// 例: コンウェイのライフは B3/S23 (近傍3で誕生、近傍2か3で生存)。

export interface Rule {
  readonly birth: ReadonlySet<number>;
  readonly survival: ReadonlySet<number>;
}

export interface RulePreset {
  name: string;
  rule: string;
  note: string;
}

// 代表的なライフ系ルール。それぞれ性質がはっきり異なるものを選んだ。
export const RULE_PRESETS: readonly RulePreset[] = [
  { name: 'Conway Life', rule: 'B3/S23', note: '最も有名な2次元ライフ' },
  { name: 'HighLife', rule: 'B36/S23', note: '自己複製するパターンを持つ' },
  { name: 'Day & Night', rule: 'B3678/S34678', note: '生と死が対称な万能ルール' },
  { name: 'Seeds', rule: 'B2/S', note: '何も生き残れず爆発的に広がる' },
  { name: 'Replicator', rule: 'B1357/S1357', note: 'あらゆる図形が自己複製する' },
  { name: 'Life without Death', rule: 'B3/S012345678', note: '一度生きたら死なない' },
  { name: 'Maze', rule: 'B3/S12345', note: '迷路状の構造へ育つ' },
  { name: 'Mazectric', rule: 'B3/S1234', note: 'Mazeより通路が長く直線的な迷路' },
  { name: 'Diamoeba', rule: 'B35678/S5678', note: 'アメーバ状の塊が伸び縮みする' },
  { name: '2x2', rule: 'B36/S125', note: '2×2のブロックを単位に進化する' },
  { name: 'Coral', rule: 'B3/S45678', note: 'サンゴ状の塊がゆっくり広がる' },
  { name: 'Anneal', rule: 'B4678/S35678', note: '多数決で境界がなめらかになる(焼きなまし)' },
  { name: 'Gnarl', rule: 'B1/S1', note: '一点から樹状の模様が育つ単純規則' },
];

function parseCounts(text: string): Set<number> {
  const set = new Set<number>();
  for (const ch of text) {
    if (ch < '0' || ch > '8') throw new Error(`近傍数は0〜8で指定します: "${ch}"`);
    set.add(ch.charCodeAt(0) - 48);
  }
  return set;
}

// "B3/S23" や順不同の "S23/B3"、文字なしの "23/3" (生存/誕生) を受け付ける。
export function parseRule(input: string): Rule {
  const cleaned = input.replace(/\s+/g, '');
  if (cleaned === '') throw new Error('ルールが空です');
  const parts = cleaned.split('/');
  if (parts.length !== 2) throw new Error(`ルールはスラッシュ区切りで指定します: "${input}"`);

  let birthText: string | undefined;
  let survivalText: string | undefined;
  for (const part of parts) {
    const tag = part[0]?.toLowerCase();
    if (tag === 'b') birthText = part.slice(1);
    else if (tag === 's') survivalText = part.slice(1);
  }

  if (birthText === undefined && survivalText === undefined) {
    // 文字を含まない場合は古い「生存/誕生」記法とみなす。
    survivalText = parts[0];
    birthText = parts[1];
  } else if (birthText === undefined || survivalText === undefined) {
    throw new Error(`ルールには B と S の両方が必要です: "${input}"`);
  }

  return { birth: parseCounts(birthText ?? ''), survival: parseCounts(survivalText ?? '') };
}

// 正規形 "B.../S..." の文字列に戻す。
export function formatRule(rule: Rule): string {
  const sort = (set: ReadonlySet<number>) => [...set].sort((a, b) => a - b).join('');
  return `B${sort(rule.birth)}/S${sort(rule.survival)}`;
}
