/**
 * UIで使う線画アイコン。すべて currentColor で描き、viewBox 指定でスケーラブルにする。
 * 装飾なので aria-hidden を付け、意味はボタン側のラベルで伝える。
 */

const ICON_BODIES = {
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  pause:
    '<rect x="7" y="5" width="3.4" height="14" rx="1"/><rect x="13.6" y="5" width="3.4" height="14" rx="1"/>',
  step: '<path d="M7 5.5v13l9-6.5z"/><rect x="16.6" y="5" width="2.6" height="13" rx="1"/>',
  back: '<path d="M17 5.5v13l-9-6.5z"/><rect x="4.4" y="5" width="2.6" height="13" rx="1"/>',
  random:
    '<rect x="4" y="4" width="16" height="16" rx="3.2"/><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none"/>',
  clear: '<path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12h8l1-12"/>',
  share:
    '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.1 11l7.8-4M8.1 13l7.8 4"/>',
  download: '<path d="M12 4v10"/><path d="M8 10.5l4 4 4-4"/><path d="M5 19h14"/>',
  scope:
    '<circle cx="11" cy="11" r="6.5"/><path d="M11 6.5v9M6.5 11h9" opacity="0.55"/><path d="M16 16l4 4"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="2.4"/><path d="M4 10h16M4 16h16M10 4v16M16 4v16"/>',
  rows: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  image:
    '<rect x="4" y="5" width="16" height="14" rx="2.4"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l4.5-4.5 3 3 3.5-3.5L20 16"/>',
  upload: '<path d="M12 20V9"/><path d="M8 12.5l4-4 4 4"/><path d="M5 5h14"/>',
  help: '<circle cx="12" cy="12" r="8.4"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.9-2.6 2-2.6 3.5"/><path d="M12 17.1h.01"/>',
} as const;

export type IconName = keyof typeof ICON_BODIES;

export function icon(name: IconName): string {
  return (
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${ICON_BODIES[name]}</svg>`
  );
}
