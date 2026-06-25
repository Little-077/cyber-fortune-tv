// ===== 设置窗口逻辑（频道 / 专注 / 外观 / 通用）=====
const { THEMES, I18N, defaultConfig } = window.APP_DATA;

const themeRow    = document.getElementById('themeRow');
const diyBox      = document.getElementById('diyBox');
const channelList = document.getElementById('channelList');
const focusBox    = document.getElementById('focusBox');
const generalBox  = document.getElementById('generalBox');
const addBtn      = document.getElementById('addChannel');
const saveBtn     = document.getElementById('saveBtn');
const statusEl    = document.getElementById('status');

let cfg = defaultConfig();
let T = I18N.zh;

function status(msg) {
  statusEl.textContent = msg;
  statusEl.classList.add('show');
  clearTimeout(status._t);
  status._t = setTimeout(() => statusEl.classList.remove('show'), 1500);
}

// ===== 分页切换 =====
const tabs = document.querySelectorAll('.tab');
const pages = document.querySelectorAll('.page');
tabs.forEach((t) => {
  t.onclick = () => {
    tabs.forEach((x) => x.classList.toggle('active', x === t));
    pages.forEach((p) => { p.hidden = (p.dataset.page !== t.dataset.tab); });
  };
});

// 静态文案随语言刷新
function applyStatic() {
  document.getElementById('setTitle').textContent = T.setTitle;
  document.title = T.setTitle.replace('📺 ', '');
  const tabText = { channels: T.tabChannels, focus: T.tabFocus, appearance: T.tabAppearance, general: T.tabGeneral };
  tabs.forEach((t) => { t.textContent = tabText[t.dataset.tab]; });
  document.getElementById('secChannels').textContent = T.tabChannels;
  document.getElementById('secFocus').textContent = T.focusTitle;
  document.getElementById('secThemes').textContent = T.apprTitle;
  document.getElementById('secDiy').textContent = T.diyTitle;
  document.getElementById('secGeneral').textContent = T.genTitle;
  addBtn.textContent = T.addChannel;
  saveBtn.textContent = T.save;
}
function renderAll() {
  applyStatic();
  renderThemes();
  renderDiy();
  renderFocus();
  renderChannels();
  renderGeneral();
}

// ===== 外观：主题（预设 + 自定义）=====
function allThemes() { return THEMES.concat(cfg.customThemes || []); }
function tName(t) { return (cfg.lang === 'en' && t.nameEn) ? t.nameEn : t.name; }

function renderThemes() {
  themeRow.innerHTML = '';
  allThemes().forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'theme-chip' + (i === (cfg.theme || 0) ? ' active' : '');
    b.style.setProperty('--c', t.phosphor);
    b.textContent = tName(t);
    b.onclick = () => { cfg.theme = i; renderThemes(); save(false, T.skinned); };
    if (i >= THEMES.length) {
      const x = document.createElement('span');
      x.className = 'chip-del';
      x.textContent = '✕';
      x.onclick = (e) => {
        e.stopPropagation();
        const ci = i - THEMES.length;
        cfg.customThemes.splice(ci, 1);
        if (cfg.theme === i) cfg.theme = 0;
        else if (cfg.theme > i) cfg.theme--;
        renderThemes();
        save(false, T.deletedTheme);
      };
      b.appendChild(x);
    }
    themeRow.appendChild(b);
  });
}

// ===== 外观：DIY 自定义 =====
function shade(hex, pct) {
  let h = (hex || '#000000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

let P = {};
function diyInitFrom(t) {
  P = {
    body: t.body, screen: t.s1, bezel: t.bezel, phosphor: t.phosphor,
    knobA: t.knobA || t.border, knobB: t.knobB || t.border,
    leg: t.leg || t.border, power: t.power, ink: t.ink || t.border,
  };
}
function diyBuild(name) {
  return {
    name,
    phosphor: P.phosphor,
    s1: P.screen, s2: shade(P.screen, -30), s3: shade(P.screen, -55),
    body: P.body, bodyD: shade(P.body, -16), bodyL: shade(P.body, 18), border: shade(P.body, -42),
    bezel: P.bezel, bezelD: shade(P.bezel, -35), bezelL: shade(P.bezel, 25),
    power: P.power, knobA: P.knobA, knobB: P.knobB, leg: P.leg, ink: P.ink,
  };
}
function diyPreview() {
  if (window.tvapi && window.tvapi.previewTheme) window.tvapi.previewTheme(diyBuild('preview'));
}
const DIY_KEYS = ['body', 'screen', 'bezel', 'phosphor', 'knobA', 'knobB', 'leg', 'power', 'ink'];

function renderDiy() {
  diyBox.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';

  const grid = document.createElement('div');
  grid.className = 'diy-grid';
  DIY_KEYS.forEach((key, i) => {
    const cell = document.createElement('label');
    cell.className = 'diy-cell';
    const sw = document.createElement('input');
    sw.type = 'color';
    sw.value = P[key] || '#888888';
    sw.oninput = () => { P[key] = sw.value; diyPreview(); };
    const t = document.createElement('span');
    t.textContent = T.diyParts[i];
    cell.append(sw, t);
    grid.appendChild(cell);
  });
  card.appendChild(grid);

  const saveRow = document.createElement('div');
  saveRow.className = 'row';
  saveRow.style.marginTop = '12px';
  const nameInp = document.createElement('input');
  nameInp.id = 'diyName';
  nameInp.placeholder = T.diyName;
  const saveAs = document.createElement('button');
  saveAs.className = 'primary';
  saveAs.textContent = T.diySaveAs;
  saveAs.style.whiteSpace = 'nowrap';
  saveAs.style.padding = '8px 14px';
  saveAs.onclick = () => {
    const def = (cfg.lang === 'en' ? 'My look ' : '我的外观') + ((cfg.customThemes || []).length + 1);
    const name = (nameInp.value || '').trim() || def;
    cfg.customThemes = cfg.customThemes || [];
    cfg.customThemes.push(diyBuild(name));
    cfg.theme = THEMES.length + cfg.customThemes.length - 1;
    nameInp.value = '';
    renderThemes();
    save(true, T.savedTheme);
  };
  saveRow.append(nameInp, saveAs);
  card.appendChild(saveRow);

  const h = document.createElement('div');
  h.className = 'hint';
  h.textContent = T.diyHint;
  card.appendChild(h);

  diyBox.appendChild(card);
}

// ===== 专注：番茄钟时间 =====
function minuteRow(labelText, inputId, value, max, presets) {
  const wrap = document.createElement('div');
  const row = document.createElement('div');
  row.className = 'row';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  const inp = document.createElement('input');
  inp.id = inputId; inp.type = 'number'; inp.min = '1'; inp.max = String(max);
  inp.value = value; inp.style.width = '74px';
  const unit = document.createElement('span');
  unit.textContent = T.minute; unit.style.color = 'var(--dim)';
  row.append(lbl, inp, unit);
  wrap.appendChild(row);

  const pr = document.createElement('div');
  pr.className = 'row';
  pr.style.flexWrap = 'wrap';
  pr.style.gap = '6px';
  pr.style.marginTop = '6px';
  const pl = document.createElement('label');
  pl.textContent = T.preset;
  pr.appendChild(pl);
  presets.forEach((m) => {
    const pb = document.createElement('button');
    pb.className = 'ghost';
    pb.textContent = m;
    pb.style.padding = '4px 11px';
    pb.onclick = () => { inp.value = m; };
    pr.appendChild(pb);
  });
  wrap.appendChild(pr);
  return wrap;
}

function renderFocus() {
  const ch = cfg.channels.find((c) => c.type === 'pomodoro');
  focusBox.innerHTML = '';
  if (!ch) { focusBox.innerHTML = '<div class="locked">' + T.noPomo + '</div>'; return; }
  const card = document.createElement('div');
  card.className = 'card';
  card.appendChild(minuteRow(T.focusLabel, 'focusMin', ch.focusMin || 25, 120, [15, 25, 45, 60]));
  const sep = document.createElement('div');
  sep.style.height = '12px';
  card.appendChild(sep);
  card.appendChild(minuteRow(T.breakLabel, 'breakMin', ch.breakMin || 5, 60, [5, 10, 15]));
  const h = document.createElement('div');
  h.className = 'hint';
  h.textContent = T.focusHint;
  card.appendChild(h);
  focusBox.appendChild(card);
}

// ===== 频道 =====
function renderChannels() {
  channelList.innerHTML = '';
  cfg.channels.forEach((ch, idx) => {
    if (ch.type === 'pomodoro') return;

    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.idx = idx;

    const row = document.createElement('div');
    row.className = 'row';
    const lbl = document.createElement('label');
    lbl.textContent = T.name;
    const name = document.createElement('input');
    name.className = 'ch-name';
    name.value = ch.type === 'fortune' ? T.chFortune : ch.name;
    if (ch.type === 'fortune') name.disabled = true;
    row.appendChild(lbl);
    row.appendChild(name);

    if (ch.type === 'fortune') {
      const tag = document.createElement('span');
      tag.className = 'tag fortune';
      tag.textContent = T.tagFortune;
      row.appendChild(tag);
      card.appendChild(row);
      const locked = document.createElement('div');
      locked.className = 'locked';
      locked.textContent = T.fortuneLocked;
      card.appendChild(locked);
    } else {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = T.tagList;
      row.appendChild(tag);
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = T.del;
      del.onclick = () => {
        const lists = cfg.channels.filter((c) => c.type !== 'fortune' && c.type !== 'pomodoro');
        if (lists.length <= 1) { status(T.keepOne); return; }
        collectForm();
        cfg.channels.splice(idx, 1);
        if (cfg.current >= cfg.channels.length) cfg.current = cfg.channels.length - 1;
        renderChannels();
      };
      row.appendChild(del);
      card.appendChild(row);

      const ta = document.createElement('textarea');
      ta.className = 'ch-options';
      ta.value = (ch.options || []).join('\n');
      ta.placeholder = T.optsPlaceholder;
      card.appendChild(ta);
      const h = document.createElement('div');
      h.className = 'hint';
      h.innerHTML = T.optsHint;
      card.appendChild(h);

      const noteRow = document.createElement('div');
      noteRow.className = 'row';
      noteRow.style.marginTop = '8px';
      const nlbl = document.createElement('label');
      nlbl.textContent = T.noteLabel;
      const note = document.createElement('input');
      note.className = 'ch-note';
      note.value = ch.note || '';
      note.placeholder = T.notePlaceholder;
      noteRow.appendChild(nlbl);
      noteRow.appendChild(note);
      card.appendChild(noteRow);
    }

    channelList.appendChild(card);
  });
}

// ===== 通用：语言 / 开机启动 =====
function renderGeneral() {
  generalBox.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';

  // 语言
  const langRow = document.createElement('div');
  langRow.className = 'row';
  const ll = document.createElement('label');
  ll.textContent = T.langLabel;
  langRow.appendChild(ll);
  [['zh', '中文'], ['en', 'English']].forEach(([code, label]) => {
    const b = document.createElement('button');
    b.className = 'ghost' + ((cfg.lang || 'zh') === code ? ' on' : '');
    b.textContent = label;
    b.style.padding = '6px 14px';
    if ((cfg.lang || 'zh') === code) { b.style.background = 'var(--panel-l)'; b.style.color = 'var(--phos)'; }
    b.onclick = () => {
      cfg.lang = code;
      T = I18N[code];
      renderAll();
      save(false, T.saved);
    };
    langRow.appendChild(b);
  });
  card.appendChild(langRow);

  // 开机启动
  const auRow = document.createElement('div');
  auRow.className = 'row';
  auRow.style.marginTop = '12px';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = 'autoLaunch';
  cb.checked = cfg.autoLaunch !== false;
  cb.style.width = '18px';
  cb.style.flex = '0 0 auto';
  cb.onchange = () => { cfg.autoLaunch = cb.checked; save(false, T.saved); };
  const al = document.createElement('label');
  al.textContent = T.autoLaunchLabel;
  al.htmlFor = 'autoLaunch';
  auRow.append(cb, al);
  card.appendChild(auRow);

  generalBox.appendChild(card);
}

// 读回表单
function collectForm() {
  channelList.querySelectorAll('.card').forEach((card) => {
    const idx = Number(card.dataset.idx);
    const ch = cfg.channels[idx];
    if (!ch) return;
    if (ch.type === 'list') {
      const nameEl = card.querySelector('.ch-name');
      if (nameEl) ch.name = nameEl.value.trim() || ch.name;
      const ta = card.querySelector('.ch-options');
      if (ta) ch.options = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
      const note = card.querySelector('.ch-note');
      if (note) ch.note = note.value.trim();
    }
  });
  const pomo = cfg.channels.find((c) => c.type === 'pomodoro');
  if (pomo) {
    const f = document.getElementById('focusMin');
    const b = document.getElementById('breakMin');
    if (f) pomo.focusMin = Math.max(1, Math.min(120, parseInt(f.value, 10) || 25));
    if (b) pomo.breakMin = Math.max(1, Math.min(60, parseInt(b.value, 10) || 5));
  }
}

function save(collect = true, msg) {
  if (collect) collectForm();
  cfg.current = Math.min(Math.max(0, cfg.current || 0), cfg.channels.length - 1);
  if (window.tvapi && window.tvapi.saveConfig) window.tvapi.saveConfig(cfg);
  status(msg || T.saved);
}

addBtn.onclick = () => {
  collectForm();
  cfg.channels.push({
    id: 'ch' + Date.now(),
    name: cfg.lang === 'en' ? 'New channel' : '新频道',
    type: 'list',
    note: cfg.lang === 'en' ? 'This one!' : '就这个！',
    options: cfg.lang === 'en' ? ['A', 'B', 'C'] : ['选项A', '选项B', '选项C'],
  });
  renderChannels();
};
saveBtn.onclick = () => save(true);

// ===== 启动 =====
async function load() {
  let loaded = null;
  if (window.tvapi && window.tvapi.getConfig) {
    try { loaded = await window.tvapi.getConfig(); } catch (e) { /* ignore */ }
  }
  if (loaded && loaded.channels && loaded.channels.length) cfg = loaded;
  cfg.customThemes = cfg.customThemes || [];
  T = I18N[cfg.lang === 'en' ? 'en' : 'zh'];
  diyInitFrom(allThemes()[cfg.theme] || THEMES[0]);
  renderAll();
}
load();

// 关闭时把电视恢复到已保存外观（清掉未保存的 DIY 预览）
window.addEventListener('beforeunload', () => {
  if (window.tvapi && window.tvapi.previewTheme) {
    window.tvapi.previewTheme(allThemes()[cfg.theme] || THEMES[0]);
  }
});
