// ===== 设置窗口逻辑（频道 / 专注 / 外观 三分页）=====
const { THEMES, defaultConfig } = window.APP_DATA;

const themeRow    = document.getElementById('themeRow');
const diyBox      = document.getElementById('diyBox');
const channelList = document.getElementById('channelList');
const focusBox    = document.getElementById('focusBox');
const addBtn      = document.getElementById('addChannel');
const saveBtn     = document.getElementById('saveBtn');
const statusEl    = document.getElementById('status');

let cfg = defaultConfig();

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

// ===== 外观：主题（预设 + 自定义）=====
function allThemes() { return THEMES.concat(cfg.customThemes || []); }

function renderThemes() {
  themeRow.innerHTML = '';
  allThemes().forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'theme-chip' + (i === (cfg.theme || 0) ? ' active' : '');
    b.style.setProperty('--c', t.phosphor);
    b.textContent = t.name;
    b.onclick = () => { cfg.theme = i; renderThemes(); save(false, '已换肤 ✓'); };
    // 自定义主题：带删除 ✕
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
        save(false, '已删除外观');
      };
      b.appendChild(x);
    }
    themeRow.appendChild(b);
  });
}

// ===== 外观：DIY 自定义 =====
// 颜色加深/提亮：pct>0 提亮，pct<0 加深
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

// DIY 取色（从当前主题初始化）
let P = {};
function diyInitFrom(t) {
  P = {
    body: t.body, screen: t.s1, bezel: t.bezel, phosphor: t.phosphor,
    knobA: t.knobA || t.border, knobB: t.knobB || t.border,
    leg: t.leg || t.border, power: t.power, ink: t.ink || t.border,
  };
}
// 由取色组装成完整主题（深浅自动推导）
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
  if (window.tvapi && window.tvapi.previewTheme) window.tvapi.previewTheme(diyBuild('预览'));
}

const DIY_PARTS = [
  ['body', '机身'], ['screen', '屏幕'], ['bezel', '屏框'], ['phosphor', '荧光(文字)'],
  ['knobA', '上旋钮'], ['knobB', '下旋钮'], ['leg', '腿'], ['power', '复位灯'], ['ink', '喇叭/字'],
];

function renderDiy() {
  diyBox.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';

  const grid = document.createElement('div');
  grid.className = 'diy-grid';
  DIY_PARTS.forEach(([key, label]) => {
    const cell = document.createElement('label');
    cell.className = 'diy-cell';
    const sw = document.createElement('input');
    sw.type = 'color';
    sw.value = P[key] || '#888888';
    sw.oninput = () => { P[key] = sw.value; diyPreview(); };
    const t = document.createElement('span');
    t.textContent = label;
    cell.append(sw, t);
    grid.appendChild(cell);
  });
  card.appendChild(grid);

  const saveRow = document.createElement('div');
  saveRow.className = 'row';
  saveRow.style.marginTop = '12px';
  const nameInp = document.createElement('input');
  nameInp.id = 'diyName';
  nameInp.placeholder = '给这套外观起个名字';
  const saveAs = document.createElement('button');
  saveAs.className = 'primary';
  saveAs.textContent = '保存为新外观';
  saveAs.style.whiteSpace = 'nowrap';
  saveAs.style.padding = '8px 14px';
  saveAs.onclick = () => {
    const name = (nameInp.value || '').trim() || ('我的外观' + ((cfg.customThemes || []).length + 1));
    cfg.customThemes = cfg.customThemes || [];
    cfg.customThemes.push(diyBuild(name));
    cfg.theme = THEMES.length + cfg.customThemes.length - 1;  // 选中新外观
    nameInp.value = '';
    renderThemes();
    save(true, '已保存外观 ✓');
  };
  saveRow.append(nameInp, saveAs);
  card.appendChild(saveRow);

  const h = document.createElement('div');
  h.className = 'hint';
  h.textContent = '改色会实时预览在电视上；同部位的深浅会自动推导。保存后出现在上面的主题列表里。';
  card.appendChild(h);

  diyBox.appendChild(card);
}

// ===== 专注：番茄钟时间（带快捷预设）=====
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
  unit.textContent = '分钟'; unit.style.color = 'var(--dim)';
  row.append(lbl, inp, unit);
  wrap.appendChild(row);

  const pr = document.createElement('div');
  pr.className = 'row';
  pr.style.flexWrap = 'wrap';
  pr.style.gap = '6px';
  pr.style.marginTop = '6px';
  const pl = document.createElement('label');
  pl.textContent = '常用';
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
  if (!ch) { focusBox.innerHTML = '<div class="locked">（没有番茄钟频道）</div>'; return; }

  const card = document.createElement('div');
  card.className = 'card';
  card.appendChild(minuteRow('专注', 'focusMin', ch.focusMin || 25, 120, [15, 25, 45, 60]));
  const sep = document.createElement('div');
  sep.style.height = '12px';
  card.appendChild(sep);
  card.appendChild(minuteRow('休息', 'breakMin', ch.breakMin || 5, 60, [5, 10, 15]));
  const h = document.createElement('div');
  h.className = 'hint';
  h.textContent = '专注倒计时，到点提醒并自动进入休息（计时切台也继续走）。改完点底部保存。';
  card.appendChild(h);
  focusBox.appendChild(card);
}

// ===== 频道（番茄钟不在此列，移到「专注」页）=====
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
    lbl.textContent = '名称';
    const name = document.createElement('input');
    name.className = 'ch-name';
    name.value = ch.name;
    row.appendChild(lbl);
    row.appendChild(name);

    if (ch.type === 'fortune') {
      const tag = document.createElement('span');
      tag.className = 'tag fortune';
      tag.textContent = '内置求签';
      row.appendChild(tag);
      card.appendChild(row);
      const locked = document.createElement('div');
      locked.className = 'locked';
      locked.textContent = '七级求签（大吉…小凶）+ 天线彩蛋，选项不可编辑。';
      card.appendChild(locked);
    } else {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '列表';
      row.appendChild(tag);
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '删除';
      del.onclick = () => {
        const lists = cfg.channels.filter((c) => c.type !== 'fortune' && c.type !== 'pomodoro');
        if (lists.length <= 1) { status('至少保留一个自定义频道'); return; }
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
      ta.placeholder = '每行一个选项，例如：\n火锅\n麻辣烫\n沙县小吃';
      card.appendChild(ta);
      const h = document.createElement('div');
      h.className = 'hint';
      h.textContent = '每行一个选项，等概率随机抽中其一。';
      card.appendChild(h);

      const noteRow = document.createElement('div');
      noteRow.className = 'row';
      noteRow.style.marginTop = '8px';
      const nlbl = document.createElement('label');
      nlbl.textContent = '结语';
      const note = document.createElement('input');
      note.className = 'ch-note';
      note.value = ch.note || '';
      note.placeholder = '出结果时的一句话，如「就它了！」';
      noteRow.appendChild(nlbl);
      noteRow.appendChild(note);
      card.appendChild(noteRow);
    }

    channelList.appendChild(card);
  });
}

// 把表单内容读回 cfg（频道页 + 专注页）
function collectForm() {
  channelList.querySelectorAll('.card').forEach((card) => {
    const idx = Number(card.dataset.idx);
    const ch = cfg.channels[idx];
    if (!ch) return;
    const nameEl = card.querySelector('.ch-name');
    if (nameEl) ch.name = nameEl.value.trim() || ch.name;
    if (ch.type === 'list') {
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

function save(collect = true, msg = '已保存 ✓') {
  if (collect) collectForm();
  cfg.current = Math.min(Math.max(0, cfg.current || 0), cfg.channels.length - 1);
  if (window.tvapi && window.tvapi.saveConfig) window.tvapi.saveConfig(cfg);
  status(msg);
}

addBtn.onclick = () => {
  collectForm();
  cfg.channels.push({
    id: 'ch' + Date.now(),
    name: '新频道',
    type: 'list',
    note: '就这个！',
    options: ['选项A', '选项B', '选项C'],
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
  diyInitFrom(allThemes()[cfg.theme] || THEMES[0]);
  renderThemes();
  renderDiy();
  renderFocus();
  renderChannels();
}
load();

// 关闭设置窗口时，把电视恢复到「已保存」的外观（清掉未保存的 DIY 预览）
window.addEventListener('beforeunload', () => {
  if (window.tvapi && window.tvapi.previewTheme) {
    window.tvapi.previewTheme(allThemes()[cfg.theme] || THEMES[0]);
  }
});
