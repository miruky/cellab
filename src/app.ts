/**
 * 画面の統括。ヘッダ・トランスポート(再生/停止/1手/消去/乱数/速度)・モード別の
 * 操作パネルを組み、Lab の状態変化を購読して活きているビューだけを描き直す。
 * キーボード操作・テーマ・URL共有・設定の保存もここでまとめる。DOMの一次窓口。
 */

import {
  RULE_PRESETS,
  PATTERNS,
  CATEGORY_LABELS,
  toRle,
  patternGrid,
  type Pattern,
  type PatternCategory,
} from './lib';
import { Lab, DEFAULT_CONFIG, type Mode } from './lab';
import { createField, type Field, type Tool } from './ui/field';
import { createDiagram, type Diagram } from './ui/diagram';
import { icon } from './ui/icons';
import { loadSettings, saveSettings, type ThemePref } from './storage';
import { encodeHash, parseHash, shareUrl } from './share';

const ELEMENTARY_PRESETS = [
  { n: 30, label: 'ルール30(カオス)' },
  { n: 90, label: 'ルール90(シェルピンスキー)' },
  { n: 110, label: 'ルール110(万能)' },
  { n: 184, label: 'ルール184(交通流)' },
  { n: 150, label: 'ルール150' },
  { n: 54, label: 'ルール54' },
];

function q<T extends Element>(root: ParentNode, sel: string): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`要素が見つかりません: ${sel}`);
  return el as T;
}

const LOGO = `<svg class="brand-logo" width="30" height="30" viewBox="0 0 48 48" role="img" aria-label="cellab">
  <title>cellab</title>
  <rect x="6" y="6" width="36" height="36" rx="9" fill="none" stroke="var(--line-strong)" stroke-width="2.4"/>
  <rect x="13" y="13" width="9" height="9" rx="2" fill="var(--accent)"/>
  <rect x="26" y="13" width="9" height="9" rx="2" fill="var(--ink-faint)"/>
  <rect x="26" y="26" width="9" height="9" rx="2" fill="var(--accent)"/>
  <rect x="13" y="26" width="9" height="9" rx="2" fill="var(--ink-faint)"/>
</svg>`;

export function mountApp(root: HTMLElement): void {
  const settings = loadSettings();
  const lab = new Lab(DEFAULT_CONFIG);

  // URLに状態があれば復元する。
  const fromUrl = parseHash(location.hash);
  if (fromUrl) lab.loadState(fromUrl);

  root.innerHTML = `
    <div class="app">
      <header class="app-header">
        <div class="brand">
          ${LOGO}
          <div class="brand-text">
            <h1>cellab</h1>
            <p class="tagline">セルオートマトンの実験場</p>
          </div>
        </div>
        <div class="header-actions">
          <div class="segmented" role="tablist" aria-label="モード">
            <button class="seg" data-mode="2d" role="tab">${icon('grid')}<span>ライフ系</span></button>
            <button class="seg" data-mode="1d" role="tab">${icon('rows')}<span>基本CA</span></button>
          </div>
          <button class="ghost icon-only" type="button" data-act="help" aria-label="キーボード操作を見る" title="キーボード操作 (?)">${icon('help')}</button>
          <button class="ghost icon-only theme-toggle" type="button" aria-label="配色を切り替え" title="配色を切り替え"></button>
        </div>
      </header>

      <div class="transport">
        <div class="transport-main">
          <button class="ghost icon-only" type="button" data-act="back" aria-label="1世代戻す" title="1世代戻す (,)" disabled>${icon('back')}</button>
          <button class="play primary-ghost" type="button" data-act="play" aria-label="再生"></button>
          <button class="ghost icon-only" type="button" data-act="step" aria-label="1世代進める" title="1世代進める (.)">${icon('step')}</button>
          <button class="ghost icon-only" type="button" data-act="clear" aria-label="消去" title="消去 (c)">${icon('clear')}</button>
          <button class="ghost icon-only" type="button" data-act="random" aria-label="ランダム配置" title="ランダム配置 (r)">${icon('random')}</button>
        </div>
        <div class="readouts">
          <span class="chip"><span class="chip-key">世代</span><span class="chip-value" data-gen>0</span></span>
          <span class="chip"><span class="chip-key">個体数</span><span class="chip-value" data-pop>0</span></span>
        </div>
        <label class="speed">
          <span class="speed-label">速度</span>
          <input type="range" min="1" max="60" step="1" data-speed aria-label="再生速度(毎秒の世代数)" />
          <span class="speed-value" data-speed-value></span>
        </label>
        <div class="transport-end">
          <button class="ghost" type="button" data-act="share">${icon('share')}<span>共有</span></button>
          <button class="ghost" type="button" data-act="import">${icon('upload')}<span>読込</span></button>
          <button class="ghost" type="button" data-act="export">${icon('download')}<span>RLE</span></button>
          <button class="ghost" type="button" data-act="png">${icon('image')}<span>画像</span></button>
        </div>
      </div>

      <div class="stage" data-stage></div>

      <section class="panel panel-2d" data-panel="2d">
        <div class="panel-row">
          <label class="field-label" for="rule-select">ルール</label>
          <select id="rule-select" class="control select" data-rule-select></select>
          <input class="control text rule-input" data-rule-input aria-label="ルール(B/S記法)" spellcheck="false" />
          <span class="rule-error" data-rule-error role="status"></span>
        </div>
        <div class="panel-row">
          <span class="field-label">境界</span>
          <div class="segmented small" data-topology>
            <button class="seg" data-topo="torus" type="button">トーラス</button>
            <button class="seg" data-topo="bounded" type="button">有限</button>
          </div>
          <span class="field-label">ツール</span>
          <div class="segmented small" data-tool>
            <button class="seg" data-tool-name="draw" type="button">描く</button>
            <button class="seg" data-tool-name="stamp" type="button">置く</button>
          </div>
          <button class="ghost" type="button" data-act="analyze">${icon('scope')}<span>判定</span></button>
          <span class="analysis" data-analysis role="status"></span>
        </div>
        <div class="palette" data-palette></div>
      </section>

      <section class="panel panel-1d" data-panel="1d" hidden>
        <div class="panel-row">
          <label class="field-label" for="elem-rule">ルール番号</label>
          <input id="elem-rule" class="control number" type="number" min="0" max="255" step="1" data-elem-rule />
          <select class="control select" data-elem-preset aria-label="基本CAのプリセット"></select>
        </div>
        <div class="panel-row">
          <span class="field-label">初期</span>
          <div class="segmented small" data-seed>
            <button class="seg" data-seed-kind="center" type="button">中央1点</button>
            <button class="seg" data-seed-kind="random" type="button">ランダム</button>
          </div>
          <button class="ghost" type="button" data-act="reseed" title="種を撒き直す">${icon('random')}<span>撒き直す</span></button>
          <label class="checkline"><input type="checkbox" data-wrap /> 端をつなぐ</label>
        </div>
      </section>
    </div>
    <div class="toast" data-toast role="status" aria-live="polite"></div>

    <dialog class="sheet" data-import-dialog aria-label="RLEを読み込む">
      <form method="dialog" class="sheet-inner">
        <div class="sheet-head">
          <h2>RLEを読み込む</h2>
          <button class="ghost icon-only" type="submit" value="cancel" aria-label="閉じる">${icon('close')}</button>
        </div>
        <p class="sheet-note">LifeWiki などのRLEパターンを貼り付けて盤に取り込みます。ルール行があれば反映します。</p>
        <textarea class="sheet-input" data-import-text spellcheck="false" rows="7" placeholder="x = 3, y = 3, rule = B3/S23&#10;bo$2bo$3o!"></textarea>
        <span class="sheet-error" data-import-error role="status"></span>
        <div class="sheet-actions">
          <button class="ghost" type="submit" value="cancel">取り消す</button>
          <button class="solid" type="submit" value="load" data-import-load>読み込む</button>
        </div>
      </form>
    </dialog>

    <dialog class="sheet" data-help-dialog aria-label="キーボード操作">
      <form method="dialog" class="sheet-inner">
        <div class="sheet-head">
          <h2>キーボード操作</h2>
          <button class="ghost icon-only" type="submit" aria-label="閉じる">${icon('close')}</button>
        </div>
        <dl class="keys">
          <div><dt><kbd>Space</kbd></dt><dd>再生 / 一時停止</dd></div>
          <div><dt><kbd>.</kbd> <kbd>→</kbd></dt><dd>1世代進める</dd></div>
          <div><dt><kbd>,</kbd> <kbd>←</kbd></dt><dd>1世代戻す</dd></div>
          <div><dt><kbd>c</kbd></dt><dd>盤を消去</dd></div>
          <div><dt><kbd>r</kbd></dt><dd>ランダム配置 / 種を撒き直す</dd></div>
          <div><dt><kbd>g</kbd></dt><dd>格子線の表示切替</dd></div>
          <div><dt><kbd>m</kbd></dt><dd>ライフ系 / 基本CA の切替</dd></div>
          <div><dt><kbd>?</kbd></dt><dd>この一覧</dd></div>
        </dl>
      </form>
    </dialog>
  `;

  const stage = q<HTMLElement>(root, '[data-stage]');
  const field: Field = createField({
    onPaint: (x, y, v) => lab.paintCell(x, y, v),
    onStamp: (x, y) => {
      if (armed) lab.stampPattern(armed, x, y);
    },
    onHover: (x, y) => {
      if (armed) {
        ghost = { x, y };
        renderActive();
      }
    },
    onLeave: () => {
      if (ghost) {
        ghost = null;
        renderActive();
      }
    },
  });
  const diagram: Diagram = createDiagram();
  stage.append(field.el, diagram.el);

  let running = false;
  let raf = 0;
  let lastT = 0;
  let acc = 0;
  let armed: Pattern | null = null;
  let ghost: { x: number; y: number } | null = null;

  // ---- テーマ ----

  function applyTheme(pref: ThemePref): void {
    if (pref === 'auto') root.ownerDocument.documentElement.removeAttribute('data-theme');
    else root.ownerDocument.documentElement.setAttribute('data-theme', pref);
    const dark =
      pref === 'dark' ||
      (pref === 'auto' &&
        typeof matchMedia !== 'undefined' &&
        matchMedia('(prefers-color-scheme: dark)').matches);
    const btn = q<HTMLButtonElement>(root, '.theme-toggle');
    btn.innerHTML = icon(dark ? 'sun' : 'moon');
    field.refreshColors();
    diagram.refreshColors();
  }

  // ---- 再生ループ ----

  function tick(t: number): void {
    if (!running) return;
    if (lastT === 0) lastT = t;
    acc += t - lastT;
    lastT = t;
    const interval = 1000 / settings.speed;
    let steps = 0;
    while (acc >= interval && steps < 16) {
      lab.step();
      acc -= interval;
      steps++;
    }
    raf = requestAnimationFrame(tick);
  }

  function setRunning(next: boolean): void {
    if (running === next) return;
    running = next;
    const btn = q<HTMLButtonElement>(root, '[data-act="play"]');
    btn.innerHTML = icon(running ? 'pause' : 'play');
    btn.setAttribute('aria-label', running ? '一時停止' : '再生');
    if (running) {
      lastT = 0;
      acc = 0;
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
    }
  }

  // ---- 描画 ----

  function renderActive(): void {
    const is2d = lab.mode === '2d';
    field.el.hidden = !is2d;
    diagram.el.hidden = is2d;
    if (is2d) {
      stage.style.aspectRatio = `${lab.config.cols} / ${lab.config.rows}`;
      field.render({
        grid: lab.grid,
        showGrid: settings.grid,
        ghost: armed && ghost ? { shape: patternGrid(armed), cx: ghost.x, cy: ghost.y } : null,
      });
    } else {
      stage.style.aspectRatio = `${lab.config.cols} / ${lab.config.historyRows}`;
      diagram.render(lab.history, lab.config.cols, lab.config.historyRows);
    }
    q<HTMLElement>(root, '[data-gen]').textContent = String(lab.generation);
    q<HTMLElement>(root, '[data-pop]').textContent = lab.population().toLocaleString();
    q<HTMLButtonElement>(root, '[data-act="back"]').disabled = !lab.canBack();
  }

  // ---- トースト ----

  let toastTimer = 0;
  function toast(message: string): void {
    const el = q<HTMLElement>(root, '[data-toast]');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  // ---- パネル構築 ----

  function buildRuleSelect(): void {
    const sel = q<HTMLSelectElement>(root, '[data-rule-select]');
    sel.innerHTML =
      RULE_PRESETS.map((p) => `<option value="${p.rule}">${p.name}(${p.rule})</option>`).join('') +
      '<option value="__custom">カスタム…</option>';
    sel.addEventListener('change', () => {
      if (sel.value === '__custom') {
        q<HTMLInputElement>(root, '[data-rule-input]').focus();
        return;
      }
      applyRule(sel.value);
    });
  }

  function applyRule(text: string): void {
    const errEl = q<HTMLElement>(root, '[data-rule-error]');
    try {
      lab.setRule(text);
      errEl.textContent = '';
      syncRuleInputs();
    } catch {
      errEl.textContent = '不正な記法です';
    }
  }

  function syncRuleInputs(): void {
    q<HTMLInputElement>(root, '[data-rule-input]').value = lab.ruleText;
    const sel = q<HTMLSelectElement>(root, '[data-rule-select]');
    const matched = RULE_PRESETS.some((p) => p.rule === lab.ruleText);
    sel.value = matched ? lab.ruleText : '__custom';
  }

  function buildPalette(): void {
    const palette = q<HTMLElement>(root, '[data-palette]');
    const order: PatternCategory[] = ['still', 'oscillator', 'spaceship', 'gun', 'methuselah'];
    palette.innerHTML = order
      .map((cat) => {
        const items = PATTERNS.filter((p) => p.category === cat);
        const chips = items
          .map(
            (p) =>
              `<button class="pattern-chip" type="button" data-pattern="${p.id}" title="${p.description}">${p.name}</button>`,
          )
          .join('');
        return `<div class="palette-group"><span class="palette-label">${CATEGORY_LABELS[cat]}</span><div class="palette-chips">${chips}</div></div>`;
      })
      .join('');
    palette.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-pattern]');
      if (!target) return;
      const id = target.dataset.pattern;
      const pattern = PATTERNS.find((p) => p.id === id) ?? null;
      armed = pattern;
      setTool('stamp');
      for (const chip of palette.querySelectorAll('.pattern-chip')) {
        chip.classList.toggle('is-armed', chip === target);
      }
      if (pattern) toast(`「${pattern.name}」を盤に置けます`);
    });
  }

  function buildElementaryPresets(): void {
    const sel = q<HTMLSelectElement>(root, '[data-elem-preset]');
    sel.innerHTML =
      '<option value="">プリセット…</option>' +
      ELEMENTARY_PRESETS.map((p) => `<option value="${p.n}">${p.label}</option>`).join('');
    sel.addEventListener('change', () => {
      if (sel.value === '') return;
      setElementaryRule(Number(sel.value));
    });
  }

  function setElementaryRule(n: number): void {
    lab.setElementaryRule(n);
    q<HTMLInputElement>(root, '[data-elem-rule]').value = String(lab.elementaryRule);
  }

  // ---- セグメント・ツールの見た目 ----

  function setMode(mode: Mode): void {
    lab.setMode(mode);
    for (const seg of root.querySelectorAll<HTMLElement>('.segmented [data-mode]')) {
      seg.classList.toggle('is-active', seg.dataset.mode === mode);
      seg.setAttribute('aria-selected', String(seg.dataset.mode === mode));
    }
    q<HTMLElement>(root, '[data-panel="2d"]').hidden = mode !== '2d';
    q<HTMLElement>(root, '[data-panel="1d"]').hidden = mode !== '1d';
    q<HTMLButtonElement>(root, '[data-act="export"]').disabled = mode !== '2d';
    renderActive();
  }

  function setTopology(topo: 'torus' | 'bounded'): void {
    lab.setTopology(topo);
    for (const seg of root.querySelectorAll<HTMLElement>('[data-topology] [data-topo]')) {
      seg.classList.toggle('is-active', seg.dataset.topo === topo);
    }
  }

  function setTool(tool: Tool): void {
    field.setTool(tool);
    if (tool === 'draw') {
      armed = null;
      ghost = null;
      for (const chip of root.querySelectorAll('.pattern-chip')) chip.classList.remove('is-armed');
    }
    for (const seg of root.querySelectorAll<HTMLElement>('[data-tool] [data-tool-name]')) {
      seg.classList.toggle('is-active', seg.dataset.toolName === tool);
    }
    renderActive();
  }

  function setSeedKind(kind: 'center' | 'random'): void {
    lab.setSeed(kind);
    for (const seg of root.querySelectorAll<HTMLElement>('[data-seed] [data-seed-kind]')) {
      seg.classList.toggle('is-active', seg.dataset.seedKind === kind);
    }
  }

  // ---- 共有・書き出し・解析 ----

  function doShare(): void {
    const state = lab.toState();
    location.hash = encodeHash(state);
    const url = shareUrl(location.href, state);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => toast('共有リンクをコピーしました'),
        () => toast('リンクをURL欄に入れました'),
      );
    } else {
      toast('リンクをURL欄に入れました');
    }
  }

  function doExport(): void {
    if (lab.mode !== '2d') return;
    const rle = toRle(lab.grid, { rule: lab.ruleText, name: 'cellab' });
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(rle).then(
        () => toast('RLEをコピーしました'),
        () => toast('RLEを書き出せませんでした'),
      );
    } else {
      toast('クリップボードを使えません');
    }
  }

  // 2次元は盤を撒き直し、1次元は新しい種で初期行を作る。
  function reroll(): void {
    if (lab.mode === '2d') lab.randomize();
    else lab.setSeed('random', (Math.random() * 1e9) >>> 0);
  }

  function doAnalyze(): void {
    const result = lab.classify();
    const el = q<HTMLElement>(root, '[data-analysis]');
    const text =
      result.kind === 'still'
        ? '安定(静物)'
        : result.kind === 'oscillator'
          ? `振動子(周期${result.period})`
          : result.kind === 'extinct'
            ? '消滅した'
            : '30世代では定まらず';
    el.textContent = text;
  }

  // 今見えているキャンバスをPNGに焼いて保存する。
  function doPng(): void {
    const canvas = lab.mode === '2d' ? field.el : diagram.el;
    if (typeof canvas.toDataURL !== 'function') {
      toast('この環境では画像を書き出せません');
      return;
    }
    let url: string;
    try {
      url = canvas.toDataURL('image/png');
    } catch {
      toast('画像を書き出せませんでした');
      return;
    }
    const a = root.ownerDocument.createElement('a');
    a.href = url;
    a.download = `cellab-${lab.mode}-gen${lab.generation}.png`;
    a.click();
    toast('画像を書き出しました');
  }

  // ---- ダイアログ ----

  const importDialog = q<HTMLDialogElement>(root, '[data-import-dialog]');
  const helpDialog = q<HTMLDialogElement>(root, '[data-help-dialog]');

  function openDialog(dialog: HTMLDialogElement): void {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function openImport(): void {
    q<HTMLElement>(root, '[data-import-error]').textContent = '';
    openDialog(importDialog);
    q<HTMLTextAreaElement>(root, '[data-import-text]').focus();
  }

  // ---- 配線 ----

  q<HTMLElement>(root, '.header-actions').addEventListener('click', (ev) => {
    const seg = (ev.target as HTMLElement).closest<HTMLElement>('[data-mode]');
    if (seg?.dataset.mode) setMode(seg.dataset.mode as Mode);
  });

  q<HTMLButtonElement>(root, '.theme-toggle').addEventListener('click', () => {
    const dark = root.ownerDocument.documentElement.getAttribute('data-theme') === 'dark';
    const next: ThemePref = dark ? 'light' : 'dark';
    settings.theme = next;
    saveSettings(settings);
    applyTheme(next);
  });

  const transport = q<HTMLElement>(root, '.transport');
  transport.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'play':
        setRunning(!running);
        break;
      case 'back':
        setRunning(false);
        lab.back();
        break;
      case 'step':
        lab.step();
        break;
      case 'clear':
        setRunning(false);
        lab.clear();
        break;
      case 'random':
        reroll();
        break;
      case 'share':
        doShare();
        break;
      case 'import':
        openImport();
        break;
      case 'export':
        doExport();
        break;
      case 'png':
        doPng();
        break;
    }
  });

  q<HTMLButtonElement>(root, '[data-act="help"]').addEventListener('click', () =>
    openDialog(helpDialog),
  );

  q<HTMLButtonElement>(root, '[data-import-load]').addEventListener('click', (ev) => {
    const text = q<HTMLTextAreaElement>(root, '[data-import-text]').value;
    const err = q<HTMLElement>(root, '[data-import-error]');
    try {
      const { name } = lab.importRle(text);
      setRunning(false);
      setMode('2d');
      syncRuleInputs();
      toast(name ? `「${name}」を読み込みました` : 'パターンを読み込みました');
    } catch {
      ev.preventDefault();
      err.textContent = 'RLEとして読み取れませんでした';
    }
  });

  const speed = q<HTMLInputElement>(root, '[data-speed]');
  speed.value = String(settings.speed);
  q<HTMLElement>(root, '[data-speed-value]').textContent = `${settings.speed}/秒`;
  speed.addEventListener('input', () => {
    settings.speed = Number(speed.value);
    q<HTMLElement>(root, '[data-speed-value]').textContent = `${settings.speed}/秒`;
    saveSettings(settings);
  });

  q<HTMLInputElement>(root, '[data-rule-input]').addEventListener('change', (ev) => {
    applyRule((ev.target as HTMLInputElement).value);
  });

  q<HTMLElement>(root, '[data-topology]').addEventListener('click', (ev) => {
    const seg = (ev.target as HTMLElement).closest<HTMLElement>('[data-topo]');
    if (seg?.dataset.topo) setTopology(seg.dataset.topo as 'torus' | 'bounded');
  });

  q<HTMLElement>(root, '[data-tool]').addEventListener('click', (ev) => {
    const seg = (ev.target as HTMLElement).closest<HTMLElement>('[data-tool-name]');
    if (seg?.dataset.toolName) setTool(seg.dataset.toolName as Tool);
  });

  q<HTMLButtonElement>(root, '[data-act="analyze"]').addEventListener('click', doAnalyze);

  q<HTMLElement>(root, '[data-seed]').addEventListener('click', (ev) => {
    const seg = (ev.target as HTMLElement).closest<HTMLElement>('[data-seed-kind]');
    if (seg?.dataset.seedKind) setSeedKind(seg.dataset.seedKind as 'center' | 'random');
  });

  q<HTMLButtonElement>(root, '[data-act="reseed"]').addEventListener('click', () => {
    lab.setSeed(lab.seedKind, (Math.random() * 1e9) >>> 0);
  });

  q<HTMLInputElement>(root, '[data-elem-rule]').addEventListener('change', (ev) => {
    const n = Number((ev.target as HTMLInputElement).value);
    if (Number.isFinite(n)) setElementaryRule(Math.min(255, Math.max(0, Math.trunc(n))));
  });

  const wrap = q<HTMLInputElement>(root, '[data-wrap]');
  wrap.checked = lab.wrap1d;
  wrap.addEventListener('change', () => lab.setWrap1d(wrap.checked));

  // キーボード操作。入力欄にフォーカスがあるときは奪わない。
  root.ownerDocument.addEventListener('keydown', (ev) => {
    // モーダルが開いている間はダイアログ側の操作を優先する。
    if (root.querySelector('dialog[open]')) return;
    const tag = (ev.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    switch (ev.key) {
      case ' ':
        ev.preventDefault();
        setRunning(!running);
        break;
      case '.':
      case 'ArrowRight':
        lab.step();
        break;
      case ',':
      case 'ArrowLeft':
        setRunning(false);
        lab.back();
        break;
      case '?':
        openDialog(helpDialog);
        break;
      case 'c':
        setRunning(false);
        lab.clear();
        break;
      case 'r':
        reroll();
        break;
      case 'g':
        settings.grid = !settings.grid;
        saveSettings(settings);
        renderActive();
        break;
      case 'm':
        setMode(lab.mode === '2d' ? '1d' : '2d');
        break;
    }
  });

  // ---- 初期化 ----

  buildRuleSelect();
  buildPalette();
  buildElementaryPresets();
  syncRuleInputs();
  setTopology(lab.topology);
  setTool('draw');
  setSeedKind(lab.seedKind);
  q<HTMLInputElement>(root, '[data-elem-rule]').value = String(lab.elementaryRule);
  applyTheme(settings.theme);

  lab.onChange(renderActive);

  // モードのセグメントを初期状態に合わせ、最初の描画を行う。
  for (const seg of root.querySelectorAll<HTMLElement>('.segmented [data-mode]')) {
    seg.classList.toggle('is-active', seg.dataset.mode === lab.mode);
    seg.setAttribute('aria-selected', String(seg.dataset.mode === lab.mode));
  }
  q<HTMLElement>(root, '[data-panel="2d"]').hidden = lab.mode !== '2d';
  q<HTMLElement>(root, '[data-panel="1d"]').hidden = lab.mode !== '1d';
  q<HTMLButtonElement>(root, '[data-act="export"]').disabled = lab.mode !== '2d';

  // 初期盤が空なら、何か動くものを置いて第一印象を作る。
  if (lab.mode === '2d' && lab.grid.population() === 0 && !fromUrl) {
    lab.randomize(0.28);
  }
  setRunning(true);
  renderActive();
}
