import { Grid } from './grid';
import { formatRule, parseRule, type Rule } from './rule';

// RLE (Run Length Encoded) はライフのパターンを表す標準的なテキスト形式。
// 先頭の #行はコメント、続く "x = w, y = h, rule = B3/S23" がヘッダ、
// その後ろが本体で、b=死, o=生, 数字=直前の繰り返し, $=改行, !=終端。
// LifeWiki などで配布されるパターンをそのまま貼り付けて読み込める。

export interface ParsedRle {
  grid: Grid;
  rule?: Rule;
  name?: string;
  comments: string[];
}

export function parseRle(text: string): ParsedRle {
  const comments: string[] = [];
  let name: string | undefined;
  let rule: Rule | undefined;
  let width: number | undefined;
  let height: number | undefined;
  const dataLines: string[] = [];
  let headerSeen = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    if (line.startsWith('#')) {
      if (line[1] === 'N') name = line.slice(2).trim();
      else comments.push(line.slice(1).trim());
      continue;
    }
    if (!headerSeen && /^x\s*=/i.test(line)) {
      headerSeen = true;
      const match = line.match(/x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)\s*(?:,\s*rule\s*=\s*([^,]+))?/i);
      if (!match) throw new Error(`RLEヘッダが読めません: "${line}"`);
      width = Number(match[1]);
      height = Number(match[2]);
      const ruleText = match[3]?.trim();
      if (ruleText) {
        try {
          rule = parseRule(ruleText);
        } catch {
          // ルール表記が独自形式のときは無視して図形だけ読み込む。
        }
      }
      continue;
    }
    dataLines.push(line);
  }

  if (width === undefined || height === undefined) {
    throw new Error('RLEヘッダ (x = .., y = ..) が見つかりません');
  }

  const grid = new Grid(width, height);
  const data = dataLines.join('');
  let x = 0;
  let y = 0;
  let count = 0;
  for (const ch of data) {
    if (ch >= '0' && ch <= '9') {
      count = count * 10 + (ch.charCodeAt(0) - 48);
      continue;
    }
    const run = count === 0 ? 1 : count;
    count = 0;
    if (ch === 'b' || ch === 'B') {
      x += run;
    } else if (ch === 'o' || ch === 'O') {
      for (let k = 0; k < run; k++) grid.set(x++, y, 1);
    } else if (ch === '$') {
      y += run;
      x = 0;
    } else if (ch === '!') {
      break;
    }
    // それ以外の文字 (空白など) は無視する。
  }
  return { grid, rule, name, comments };
}

export interface ToRleOptions {
  rule?: Rule | string;
  name?: string;
  // 既定では生きたセルの最小矩形に切り詰める。盤面ごと残すなら false。
  crop?: boolean;
}

function encodeRow(grid: Grid, ox: number, oy: number, y: number, width: number): string {
  let out = '';
  let tag = '';
  let len = 0;
  const flush = () => {
    if (len === 0) return;
    out += len === 1 ? tag : `${len}${tag}`;
    len = 0;
  };
  for (let x = 0; x < width; x++) {
    const next = grid.get(ox + x, oy + y) !== 0 ? 'o' : 'b';
    if (next === tag) {
      len++;
    } else {
      flush();
      tag = next;
      len = 1;
    }
  }
  // 行末の死セルは省略するのが慣習。生セルで終わるときだけ書き出す。
  if (tag === 'o') flush();
  return out;
}

export function toRle(grid: Grid, options: ToRleOptions = {}): string {
  const { crop = true } = options;
  let ox = 0;
  let oy = 0;
  let width = grid.width;
  let height = grid.height;
  if (crop) {
    const box = grid.boundingBox();
    if (box) {
      ox = box.minX;
      oy = box.minY;
      width = box.maxX - box.minX + 1;
      height = box.maxY - box.minY + 1;
    } else {
      // 生きたセルが無い盤面は最小の 1x1 (空) として表す。
      width = 1;
      height = 1;
    }
  }

  const ruleText =
    typeof options.rule === 'string'
      ? options.rule
      : options.rule
        ? formatRule(options.rule)
        : undefined;

  const head: string[] = [];
  if (options.name) head.push(`#N ${options.name}`);
  head.push(`x = ${width}, y = ${height}${ruleText ? `, rule = ${ruleText}` : ''}`);

  const rows: string[] = [];
  for (let y = 0; y < height; y++) rows.push(encodeRow(grid, ox, oy, y, width));
  while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();

  let data = rows.join('$').replace(/\${2,}/g, (m) => `${m.length}$`);
  data += '!';

  const wrapped = data.match(/.{1,70}/g) ?? [data];
  return [...head, ...wrapped].join('\n') + '\n';
}
