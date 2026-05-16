/**
 * 表示の好み(配色・速度・グリッド線)をlocalStorageに薄く保存する。
 * プライベートブラウズなどで使えないときも例外でアプリを止めないよう読み書きを握りつぶす。
 */

export type ThemePref = 'auto' | 'light' | 'dark';

export interface Settings {
  /** 配色。auto は OS の設定に従う。 */
  theme: ThemePref;
  /** 自動再生の速さ(1秒あたりの世代数)。 */
  speed: number;
  /** 2次元盤にセルの境界線を引くか。 */
  grid: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  speed: 12,
  grid: true,
};

const SETTINGS_KEY = 'cellab:settings';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 保存できなくても操作は続ける
  }
}

export function loadSettings(): Settings {
  const raw = read(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    // 壊れた値で再生が暴走しないよう速度だけは範囲に収める。
    merged.speed = Math.min(60, Math.max(1, merged.speed));
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, JSON.stringify(settings));
}
