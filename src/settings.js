// ===== 设置窗口逻辑 =====
const { THEMES, defaultConfig } = window.APP_DATA;

const themeRow    = document.getElementById('themeRow');
const channelList = document.getElementById('channelList');
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

// ===== 主题 =====
function renderThemes() {
  themeRow.innerHTML = '';
  THEMES.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'theme-chip' + (i === (cfg.theme || 0) ? ' active' : '');
    b.style.setProperty('--c', t.phosphor);
    b.textContent = t.name;
    b.onclick = () => { cfg.theme = i; renderThemes(); save(false, '已换肤 ✓'); };
    themeRow.appendChild(b);
  });
}

// ===== 频道 =====
function renderChannels() {
  channelList.innerHTML = '';
  cfg.channels.forEach((ch, idx) => {
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
        if (cfg.channels.length <= 1) { status('至少保留一个频道'); return; }
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

// 把表单内容读回 cfg.channels
function collectForm() {
  document.querySelectorAll('.card').forEach((card) => {
    const idx = Number(card.dataset.idx);
    const ch = cfg.channels[idx];
    if (!ch) return;
    const nameEl = card.querySelector('.ch-name');
    if (nameEl) ch.name = nameEl.value.trim() || ch.name;
    if (ch.type !== 'fortune') {
      const ta = card.querySelector('.ch-options');
      if (ta) ch.options = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
      const note = card.querySelector('.ch-note');
      if (note) ch.note = note.value.trim();
    }
  });
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
  renderThemes();
  renderChannels();
}
load();
