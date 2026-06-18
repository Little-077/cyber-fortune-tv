// ===== 赛博抽抽机 · 渲染进程 =====
const { THEMES, FORTUNES, defaultConfig } = window.APP_DATA;

// 待机颜文字：不带两侧括号（电视边框本身就是脸的轮廓）。含 3 字与 5 字
const KAOMOJI = [
  '・ω・', '◕ω◕', '˘ω˘', '・ｰ・', '＾▽＾', '・◡・', '•ω•', '>ω<',
  '◉ω◉', '´ω`', '・▽・', 'ㅇㅅㅇ', '☉ω☉', '◔ω◔', 'ↀ▽ↀ',
  '๑•ω•๑', '｡•ω•｡', '◞•ω•◟', '▰•ω•▰', '✧•ω•✧', 'ʕ•ω•ʔ',
  '☆▽☆', '＞ω＜', '◍•ω•◍', '〆•ω•〆',
];
const BLINK = '・_・';

// ===== DOM =====
const tv         = document.getElementById('tv');
const screen     = document.getElementById('screen');
const reel       = document.getElementById('reel');
const phrase     = document.getElementById('phrase');
const hint       = document.getElementById('hint');
const chLabel    = document.getElementById('chLabel');
const banner     = document.getElementById('banner');
const powerBtn   = document.getElementById('powerBtn');
const screenWrap = document.getElementById('screenWrap');
const closeBtn   = document.getElementById('closeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const antenna    = document.getElementById('antenna');
const knobChannel = document.getElementById('knobChannel');
const knobTheme   = document.getElementById('knobTheme');
const crtContent = document.getElementById('crtContent');

let config = defaultConfig();
let rolling = false;
let showingResult = false;   // 是否停留在结果（点蓝灯复位）
let idleTimer = null;

// 天线伸缩状态（px）：可拉得很长（约 5 倍）
const ROD_MIN = 40, ROD_MAX = 420, ROD_LUCK_FROM = 130;
let rodLen = 90;

// ===== 工具 =====
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function chars(s) { return [...s].length; }

// 结果文字按长度自适应字号，保证放得下
function sizeFor(s) {
  const n = chars(s);
  if (n <= 2) return 46;
  if (n === 3) return 40;
  if (n === 4) return 34;
  if (n === 5) return 28;
  return Math.max(16, Math.floor(150 / n));
}

function curChannel() {
  return config.channels[clamp(config.current, 0, config.channels.length - 1)];
}

// 隐藏彩蛋：天线越长越欧，拉到最长时大吉额外 +5%（仅求签频道）
function daikichiBonus() {
  const t = clamp((rodLen - ROD_LUCK_FROM) / (ROD_MAX - ROD_LUCK_FROM), 0, 1);
  return 0.05 * t;
}
function weightedFortune() {
  if (Math.random() < daikichiBonus()) return FORTUNES[0]; // 大吉
  const total = FORTUNES.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FORTUNES) if ((r -= f.weight) < 0) return f;
  return FORTUNES[FORTUNES.length - 1];
}

// ===== 持久化 =====
function persist() {
  if (window.tvapi && window.tvapi.saveConfig) window.tvapi.saveConfig(config);
}

// ===== 主题 =====
function applyTheme(idx) {
  const t = THEMES[clamp(idx, 0, THEMES.length - 1)];
  const r = document.documentElement.style;
  r.setProperty('--phosphor', t.phosphor);
  r.setProperty('--s1', t.s1); r.setProperty('--s2', t.s2); r.setProperty('--s3', t.s3);
  r.setProperty('--body', t.body); r.setProperty('--body-d', t.bodyD);
  r.setProperty('--body-l', t.bodyL); r.setProperty('--tv-border', t.border);
  r.setProperty('--bezel', t.bezel); r.setProperty('--bezel-d', t.bezelD);
  r.setProperty('--bezel-l', t.bezelL); r.setProperty('--power-on', t.power);
  r.setProperty('--knob-a', t.knobA || t.border);
  r.setProperty('--knob-b', t.knobB || t.border);
  r.setProperty('--leg', t.leg || t.border);
  r.setProperty('--ink', t.ink || t.border);
}

// 旋钮按「频道/主题数量」等分 360°。用累计角度保证点击时始终顺时针转动
let knobAngle = { channel: 0, theme: 0 };
function setKnob(el, deg, animate) {
  if (animate) {
    el.style.transform = `rotate(${deg}deg)`;
  } else {
    const prev = el.style.transition;
    el.style.transition = 'none';          // 启动/外部变更：瞬间到位，不反向扫
    el.style.transform = `rotate(${deg}deg)`;
    void el.offsetWidth;
    el.style.transition = prev || '';
  }
}
// 绝对同步到当前索引（瞬间）
function syncKnobs() {
  knobAngle.channel = (config.current / Math.max(1, config.channels.length)) * 360;
  knobAngle.theme = ((config.theme || 0) / Math.max(1, THEMES.length)) * 360;
  setKnob(knobChannel, knobAngle.channel, false);
  setKnob(knobTheme, knobAngle.theme, false);
}
function phosphor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--phosphor').trim() || '#7CFCD8';
}

// ===== 音效（WebAudio）=====
let audioCtx = null;
function beep(freq, dur = 0.05, type = 'square', gain = 0.04) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq; g.gain.value = gain;
    osc.connect(g).connect(audioCtx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) { /* 静默失败 */ }
}
function chime() {
  beep(523, 0.08, 'square', 0.05);
  setTimeout(() => beep(659, 0.08, 'square', 0.05), 80);
  setTimeout(() => beep(784, 0.16, 'square', 0.06), 160);
}

// ===== 横幅（换台/换肤）=====
// 横幅占据表情位置：先隐藏表情区 → 显示频道/主题名 → 横幅消失后回调（再显现表情）
function showBanner(text, after) {
  banner.textContent = text;
  crtContent.classList.add('hidden');     // 隐藏表情，避免遮挡
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => {
    crtContent.classList.remove('hidden'); // 横幅消失，下一帧表情出现
    if (after) after();
  }, 720);                                  // 与 bannerFlash 动画时长一致
}

// ===== 频道标签 =====
function updateLabel() {
  const ch = curChannel();
  chLabel.textContent = `CH${config.current + 1} · ${ch.name}`;
}

// ===== 待机：颜文字 + 天线开合 =====
function goIdle() {
  rolling = false;
  showingResult = false;
  reel.classList.add('idle', 'kaomoji');
  antenna.classList.add('idle');
  reel.style.fontSize = '';            // 交回 .kaomoji 的字号
  reel.style.color = phosphor();
  reel.textContent = rand(KAOMOJI);
  phrase.style.opacity = 0;
  const ch = curChannel();
  hint.textContent = ch.type === 'fortune' ? '点我求签' : '点我决定吧';
  hint.style.opacity = 0.55;
  powerBtn.classList.remove('on');
  updateLabel();

  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if (rolling || showingResult) return;
    if (Math.random() < 0.4) {
      const cur = reel.textContent;
      reel.textContent = BLINK;
      setTimeout(() => { if (!rolling && !showingResult) reel.textContent = cur; }, 140);
    } else {
      reel.textContent = rand(KAOMOJI);
    }
  }, 3200);
}

// ===== 抽签 / 抽选（通用：求签 or 列表）=====
function draw() {
  if (rolling) return;
  const ch = curChannel();

  // 构造滚动池 + 结果
  let pool, result;
  if (ch.type === 'fortune') {
    pool = FORTUNES.map(f => ({ text: f.level, color: f.color }));
    const f = weightedFortune();
    result = { text: f.level, color: f.color, note: rand(f.phrases) };
  } else {
    const opts = (ch.options && ch.options.length) ? ch.options : ['（空）'];
    const c = phosphor();
    pool = opts.map(o => ({ text: o, color: c }));
    result = { text: rand(opts), color: c, note: ch.note || '就这个！' };
  }

  rolling = true;
  showingResult = false;
  clearInterval(idleTimer);
  reel.classList.remove('idle', 'kaomoji');
  antenna.classList.remove('idle');
  phrase.style.opacity = 0;
  hint.style.opacity = 0;
  powerBtn.classList.add('on');
  tv.classList.add('rolling');
  screen.classList.add('rolling');

  const startTime = Date.now();
  const DURATION = 1900;

  function tick() {
    const elapsed = Date.now() - startTime;
    const item = rand(pool);
    reel.style.fontSize = '36px';
    reel.textContent = item.text;
    reel.style.color = item.color;
    beep(220 + Math.random() * 600, 0.02, 'square', 0.02);

    if (elapsed >= DURATION) { lockResult(result); return; }
    const progress = elapsed / DURATION;
    setTimeout(tick, 45 + progress * progress * 320);
  }
  tick();
}

function lockResult(result) {
  rolling = false;
  showingResult = true;
  tv.classList.remove('rolling');
  screen.classList.remove('rolling');

  reel.style.fontSize = sizeFor(result.text) + 'px';
  reel.textContent = result.text;
  reel.style.color = result.color;

  screen.classList.remove('flash');
  void screen.offsetWidth;
  screen.classList.add('flash');
  chime();

  phrase.textContent = result.note;
  phrase.style.color = result.color;
  setTimeout(() => { phrase.style.opacity = 0.95; }, 250);

  hint.textContent = '再抽一次 ↻';
  hint.style.opacity = 0.55;
}

// ===== 换台 / 换肤 =====
function switchChannel(delta) {
  if (rolling) return;
  const n = config.channels.length;
  config.current = (config.current + delta + n) % n;
  persist();
  knobAngle.channel += (delta * 360) / n;   // 累计角度 → 始终顺时针
  setKnob(knobChannel, knobAngle.channel, true);
  updateLabel();                 // 顶部标签立即更新为新频道
  // 换台雪花一闪
  screen.classList.add('rolling');
  beep(180, 0.05, 'sawtooth', 0.03);
  setTimeout(() => screen.classList.remove('rolling'), 220);
  // 频道名出现在表情位置，消失后再显现表情
  showBanner(curChannel().name, goIdle);
}
function switchTheme(delta) {
  if (rolling) return;
  const n = THEMES.length;
  config.theme = ((config.theme || 0) + delta + n) % n;
  applyTheme(config.theme);
  persist();
  knobAngle.theme += (delta * 360) / n;     // 累计角度 → 始终顺时针
  setKnob(knobTheme, knobAngle.theme, true);
  beep(440, 0.05, 'triangle', 0.03);
  if (!showingResult) reel.style.color = phosphor();
  // 主题名出现在表情位置，消失后表情再显现（待机态则刷新表情颜色）
  showBanner(THEMES[config.theme].name, () => {
    if (!rolling && !showingResult) reel.style.color = phosphor();
  });
}

// ===== 事件绑定 =====
// 屏幕：始终是「抽 / 再抽一次」
function onScreenClick() { if (!rolling) draw(); }
// 电源键：待机抽；结果时复位
function onPowerClick() {
  if (rolling) return;
  if (showingResult) goIdle();
  else draw();
}
screenWrap.addEventListener('click', onScreenClick);
powerBtn.addEventListener('click', (e) => { e.stopPropagation(); onPowerClick(); });

knobChannel.addEventListener('click', (e) => { e.stopPropagation(); if (!rolling) switchChannel(1); });
knobTheme.addEventListener('click', (e) => { e.stopPropagation(); switchTheme(1); });

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (window.tvapi && window.tvapi.openSettings) window.tvapi.openSettings();
});

closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (window.tvapi && window.tvapi.quit) window.tvapi.quit();
  else window.close();
});

// 空格 / 回车 = 点屏幕
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); onScreenClick(); }
});

// ===== 天线：上下拖动伸缩 + 通知主进程贴合窗口高度 =====
function requestFit() {
  if (!window.tvapi || !window.tvapi.fit) return;
  const h = Math.ceil(tv.getBoundingClientRect().height) + 16;
  window.tvapi.fit(h);
}
function setRodLen(px) {
  rodLen = clamp(px, ROD_MIN, ROD_MAX);
  antenna.style.setProperty('--rod-len', rodLen + 'px');
  antenna.style.setProperty('--ant-h', Math.round(rodLen * 0.98 + 30) + 'px');
  requestFit();
}
antenna.addEventListener('mousedown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const startY = e.screenY;
  const startLen = rodLen;
  function onMove(ev) { setRodLen(startLen + (startY - ev.screenY)); }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
});

// ===== 滚轮缩放整机 =====
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (window.tvapi && window.tvapi.zoom) window.tvapi.zoom(e.deltaY < 0 ? 0.06 : -0.06);
}, { passive: false });

// ===== 设置面板保存后，热更新配置 =====
if (window.tvapi && window.tvapi.onConfigChanged) {
  window.tvapi.onConfigChanged((cfg) => {
    if (!cfg) return;
    config = cfg;
    config.current = clamp(config.current || 0, 0, config.channels.length - 1);
    applyTheme(config.theme || 0);
    syncKnobs();
    if (!rolling) goIdle();
  });
}

// ===== 启动 =====
async function init() {
  let cfg = null;
  if (window.tvapi && window.tvapi.getConfig) {
    try { cfg = await window.tvapi.getConfig(); } catch (e) { /* ignore */ }
  }
  if (!cfg || !cfg.channels || !cfg.channels.length) {
    cfg = defaultConfig();
    config = cfg;
    persist();
  } else {
    config = cfg;
  }
  config.current = clamp(config.current || 0, 0, config.channels.length - 1);
  applyTheme(config.theme || 0);
  syncKnobs();
  setRodLen(rodLen);
  goIdle();
}
init();
