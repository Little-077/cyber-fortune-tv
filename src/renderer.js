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

// 心情表情集：开心 / 普通 / 犯困 / 睡着
const FACE = {
  happy:  ['＾▽＾', '◕ω◕', '☆▽☆', '✧ω✧', '＞ω＜', '・◡・', '◍•ω•◍'],
  normal: KAOMOJI,
  drowsy: ['˘ω˘', '－ω－', 'ᴗωᴗ', '－﹏－', '≖_≖'],
  asleep: ['－ω－', '＿ω＿', '￣ω￣', '－ ﹏ －'],
};

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
const pomoBtn    = document.getElementById('pomoBtn');
const claudeBadge = document.getElementById('claudeBadge');
const eyes = document.getElementById('eyes');
const writer = document.getElementById('writer');
const pomoMini = document.getElementById('pomoMini');
const stage = document.querySelector('.stage');

let config = defaultConfig();
let rolling = false;
let showingResult = false;   // 是否停留在结果（点蓝灯复位）
let idleTimer = null;

// 心情/发呆状态
let lastActive = Date.now();
let currentMood = null;
let faceTick = 0;

// 番茄钟状态（全局：切台也继续走，到点提醒）
let pomo = { phase: 'idle', remain: 0, running: false, timer: null };
let pomoFullUntil = 0;   // 在此时间戳前，番茄钟强制全屏（即使 Claude 在忙）
function pomoFullActive() { return Date.now() < pomoFullUntil; }
// 庆祝状态
let celebrating = false, celebrateTimer = null, celebrateEnd = null;
// Claude Code 状态：'idle' | 'working' | 'waiting'
let claudeState = 'idle';
let workDots = 0;

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

// ===== 主题（预设 + 用户自定义）=====
function allThemes() { return THEMES.concat(config.customThemes || []); }
function applyThemeObj(t) {
  if (!t) return;
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
function applyTheme(idx) {
  const list = allThemes();
  applyThemeObj(list[clamp(idx, 0, list.length - 1)]);
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
// 可换台的频道（番茄钟不参与旋钮换台，由专属按钮进入）
function rotatables() {
  const list = [];
  config.channels.forEach((c, i) => { if (c.type !== 'pomodoro') list.push(i); });
  return list;
}
// 绝对同步到当前索引（瞬间）
function syncKnobs() {
  const list = rotatables();
  let pos = list.indexOf(config.current);
  if (pos < 0) pos = 0;
  knobAngle.channel = (pos / Math.max(1, list.length)) * 360;
  knobAngle.theme = ((config.theme || 0) / Math.max(1, allThemes().length)) * 360;
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

// 番茄钟侧键自锁：在番茄钟频道时保持按下，离开才弹起
function updatePomoBtn() {
  if (pomoBtn) pomoBtn.classList.toggle('pressed', curChannel().type === 'pomodoro');
}

// ===== 心情 / 发呆 =====
function moodNow() {
  if (pomo.running) return 'happy';            // 计时中保持清醒
  const t = (Date.now() - lastActive) / 1000;
  if (t < 50) return 'happy';
  if (t < 110) return 'normal';
  if (t < 190) return 'drowsy';
  return 'asleep';                             // 约 3 分钟没理它就睡
}
function idleHint() {
  return curChannel().type === 'fortune' ? '点我求签' : '点我决定吧';
}
function applyMoodVisual(mood) {
  antenna.classList.remove('happy', 'sleepy', 'asleep');
  screen.classList.remove('dim', 'drowsy');
  reel.classList.remove('sleeping');
  if (mood === 'happy') {
    antenna.classList.add('happy'); hint.textContent = idleHint();
  } else if (mood === 'drowsy') {
    antenna.classList.add('sleepy'); screen.classList.add('drowsy'); hint.textContent = '有点困…';
  } else if (mood === 'asleep') {
    antenna.classList.add('sleepy', 'asleep'); screen.classList.add('dim');
    reel.classList.add('sleeping'); hint.textContent = 'Zzz…';
  } else {
    hint.textContent = idleHint();
  }
}
function applyMoodFace() {
  const set = FACE[currentMood] || KAOMOJI;
  reel.textContent = rand(set);
  reel.style.color = phosphor();
}
function idleTick() {
  if (rolling || showingResult || celebrating) return;
  if (curChannel().type === 'pomodoro' && pomoFullActive()) { renderPomo(); return; }   // 番茄钟全屏 3s 优先
  if (claudeState !== 'idle') { claudeScreen(); updatePomoMini(); return; }   // Claude 占主屏（任意频道）
  if (curChannel().type === 'pomodoro') return;
  if (pomo.running) lastActive = Date.now();
  const mood = moodNow();
  if (mood !== currentMood) {            // 切换心情：立即换脸 + 视觉
    currentMood = mood;
    applyMoodVisual(mood);
    applyMoodFace();
    faceTick = 0;
    return;
  }
  if (mood === 'asleep') return;         // 睡着：不换脸、不眨眼
  faceTick++;
  if (faceTick % 3 !== 0) return;
  if (mood !== 'happy' && Math.random() < 0.4) {  // 偶尔眨眼
    const cur = reel.textContent;
    reel.textContent = BLINK;
    setTimeout(() => { if (!rolling && !showingResult && currentMood === mood) reel.textContent = cur; }, 140);
  } else {
    applyMoodFace();
  }
}
// 任意互动：刷新活跃时间；若在犯困/打瞌睡则明显惊醒
function markActive() {
  const wasSleep = (currentMood === 'drowsy' || currentMood === 'asleep');
  lastActive = Date.now();
  if (wasSleep && curChannel().type !== 'pomodoro' && !rolling && !showingResult && !celebrating) {
    currentMood = 'happy';
    applyMoodVisual('happy');
    reel.classList.remove('sleeping');
    reel.classList.add('idle', 'kaomoji');
    reel.style.fontSize = '';
    reel.textContent = '⊙▽⊙';            // 惊醒：吓一跳
    reel.style.color = phosphor();
    faceTick = 0;
    // 抖一下 + 屏幕闪一下 + 醒来音
    tv.classList.remove('jolt'); void tv.offsetWidth; tv.classList.add('jolt');
    screen.classList.remove('wake'); void screen.offsetWidth; screen.classList.add('wake');
    beep(700, 0.05, 'sine', 0.04);
    setTimeout(() => beep(980, 0.06, 'sine', 0.04), 70);
    setTimeout(() => { if (currentMood === 'happy' && !rolling && !showingResult) applyMoodFace(); }, 520);
  }
}

// ===== 番茄钟 =====
function pomoCh() { return config.channels.find(c => c.type === 'pomodoro'); }
function pomoSecs() {
  const ch = pomoCh() || {};
  return { focus: (ch.focusMin || 25) * 60, brk: (ch.breakMin || 5) * 60 };
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
// 顶部迷你倒计时（与 Claude 并存时用）
function pomoMiniText() {
  return (pomo.phase === 'break' ? '☕ ' : '🍅 ') + fmtTime(pomo.remain);
}
function updatePomoMini() {
  const show = pomo.running && claudeState !== 'idle' && !pomoFullActive();
  pomoMini.classList.toggle('show', show);
  if (show) pomoMini.textContent = pomoMiniText();
}
// 每秒刷新：全屏期 or Claude 空闲→在番茄钟频道画大倒计时；否则只更新顶部迷你条
function pomoTickRender() {
  updatePomoMini();
  if (curChannel().type === 'pomodoro' && (claudeState === 'idle' || pomoFullActive())) renderPomo();
}
function renderPomo() {
  if (curChannel().type !== 'pomodoro') return;
  if (claudeState !== 'idle' && !pomoFullActive()) { updatePomoMini(); return; }   // Claude 占主屏：倒计时走顶部迷你条
  clearInterval(idleTimer);
  clearClaudeScreen();
  antenna.classList.remove('happy', 'sleepy'); antenna.classList.add('idle');
  screen.classList.remove('dim');
  reel.classList.remove('kaomoji', 'idle');
  reel.style.fontSize = '42px';
  reel.style.color = phosphor();
  const t = pomo.phase === 'idle' ? pomoSecs().focus : pomo.remain;
  reel.textContent = fmtTime(t);
  phrase.textContent = pomo.phase === 'break' ? '☕ 休息' : (pomo.phase === 'focus' ? '🍅 专注' : '🍅 番茄钟');
  phrase.style.color = phosphor();
  phrase.style.opacity = 0.8;
  if (pomo.phase === 'idle') hint.textContent = '点我开始专注';
  else hint.textContent = pomo.running ? '进行中 · 点暂停' : '已暂停 · 点继续';
  hint.style.opacity = 0.6;
  powerBtn.classList.toggle('on', pomo.running);
  updateLabel();
}
function pomoRun() {
  clearInterval(pomo.timer);
  pomoTickRender();
  pomo.timer = setInterval(() => {
    pomo.remain--;
    pomoTickRender();
    if (pomo.remain <= 0) {
      clearInterval(pomo.timer);
      pomo.running = false;
      pomoComplete(pomo.phase);
    }
  }, 1000);
}
function pomoStartPhase(phase) {
  const s = pomoSecs();
  pomo.phase = phase;
  pomo.remain = phase === 'focus' ? s.focus : s.brk;
  pomo.running = true;
  beep(523, 0.07, 'sine', 0.05);
  pomoRun();
}
function pomoToggle() {
  if (pomo.phase === 'idle') { pomoStartPhase('focus'); return; }
  if (pomo.running) { pomo.running = false; clearInterval(pomo.timer); beep(300, 0.05, 'sine', 0.04); pomoTickRender(); }
  else { pomo.running = true; beep(500, 0.05, 'sine', 0.04); pomoRun(); }
}
function pomoReset() {
  clearInterval(pomo.timer);
  pomo = { phase: 'idle', remain: 0, running: false, timer: null };
  beep(220, 0.06, 'sawtooth', 0.03);
  updatePomoMini();   // 隐藏迷你条
  renderPomo();
}
// 到点庆祝：欢快音 + 全屏闪 + 整机抖 + 天线乱晃 + 撒花
function fanfare() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((f, i) => setTimeout(() => beep(f, 0.13, 'square', 0.06), i * 95));
}
function spawnConfetti() {
  const colors = ['#FFD93D', '#9BE86C', '#7CFCD8', '#7CC8FC', '#FF8C6B', '#FF6B8B', '#E98BFF'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', (Math.random() * 50 - 25) + 'px');
    p.style.animationDuration = (1.1 + Math.random() * 0.8) + 's';
    p.style.animationDelay = (Math.random() * 0.25) + 's';
    screen.appendChild(p);
    setTimeout(() => p.remove(), 2300);
  }
}
const CELEBRATE_MS = 17000;            // 庆祝持续约 17 秒
function celebrate(onDone) {
  celebrating = true;
  celebrateEnd = onDone;
  antenna.classList.add('party');      // 天线全程乱晃
  fanfare();
  const start = Date.now();
  let n = 0;
  (function pulse() {
    if (!celebrating) return;
    if (Date.now() - start >= CELEBRATE_MS) { endCelebrate(); return; }
    spawnConfetti();                                       // 持续撒花
    if (n % 3 === 0) { screen.classList.remove('party'); void screen.offsetWidth; screen.classList.add('party'); } // 闪光脉冲
    if (n % 4 === 0) { tv.classList.remove('party'); void tv.offsetWidth; tv.classList.add('party'); }             // 抖动脉冲
    if (n > 0 && n % 7 === 0) fanfare();                   // 分几次再奏乐
    n++;
    celebrateTimer = setTimeout(pulse, 800);
  })();
}
function endCelebrate() {
  if (!celebrating) return;
  celebrating = false;
  clearTimeout(celebrateTimer); celebrateTimer = null;
  tv.classList.remove('party');
  screen.classList.remove('party');
  antenna.classList.remove('party');
  const done = celebrateEnd; celebrateEnd = null;
  if (done) done();
}
function pomoComplete(phase) {
  // 屏幕进入「完成」庆祝态（撒花/闪光持续期间一直显示）
  reel.classList.remove('kaomoji', 'idle', 'sleeping');
  reel.style.fontSize = '46px';
  reel.textContent = '🎉';
  reel.style.color = phosphor();
  phrase.textContent = phase === 'focus' ? '专注完成！' : '休息结束！';
  phrase.style.color = phosphor();
  phrase.style.opacity = 0.95;
  hint.textContent = phase === 'focus' ? '即将开始休息…' : '准备好再战！';
  hint.style.opacity = 0.6;
  celebrate(() => {
    if (phase === 'focus') pomoStartPhase('break');   // 庆祝结束后开始休息
    else pomo.phase = 'idle';
    if (curChannel().type === 'pomodoro') renderPomo();
    else goIdle();                                     // 不在番茄钟台则恢复表情
  });
}

// ===== Claude Code 状态 =====
// 能否占主屏：仅在非番茄钟频道、且没在抽签/出结果/庆祝时
function claudeTakeoverOk() {
  return claudeState !== 'idle' && !rolling && !showingResult && !celebrating;
}
function updateClaudeBadge() {
  // 工作/等待都用屏幕画面表现，不用角标；角标只在完成时显示 ✓
  claudeBadge.classList.remove('show', 'working', 'waiting', 'done');
}
// 清掉 Claude 占屏的元素（笔/眼睛），恢复普通显示
function clearClaudeScreen() {
  eyes.classList.remove('show');
  writer.classList.remove('show');
  reel.style.display = '';
  reel.classList.remove('writing');
}
// Claude 占主屏：working = 像素笔写字；waiting = 像素眼睛
function claudeScreen() {
  antenna.classList.remove('happy', 'sleepy');
  antenna.classList.add('idle', 'busy');
  screen.classList.remove('dim', 'drowsy');
  phrase.style.opacity = 0;
  reel.style.display = 'none';
  if (claudeState === 'waiting') {
    writer.classList.remove('show');
    eyes.classList.add('show');
    hint.textContent = 'Claude 等你确认…';
  } else {
    eyes.classList.remove('show');
    writer.classList.add('show');
    hint.textContent = 'Claude 工作中…';
  }
  hint.style.opacity = 0.8;
}
function setClaudeState(s) {
  claudeState = s;             // 'working' | 'waiting'
  lastActive = Date.now();     // 工作期间不犯困/睡着
  updateClaudeBadge();
  if (claudeTakeoverOk()) { claudeScreen(); }
  updatePomoMini();            // 番茄钟在跑则把倒计时缩到顶部条
}
function claudeDone() {
  claudeState = 'idle';
  lastActive = Date.now();
  clearInterval(idleTimer);
  antenna.classList.remove('busy', 'happy', 'sleepy');
  clearClaudeScreen();           // 先清掉写字笔/等待眼睛，确保显示开心颜文字
  updateClaudeBadge();
  updatePomoMini();              // Claude 结束→隐藏顶部条（倒计时回大屏由后续恢复）

  chime();
  // 整机蹦跳+左右倾斜，天线随每跳一收一开（3 遍）+ 撒星星
  tv.classList.remove('hop'); void tv.offsetWidth; tv.classList.add('hop');
  antenna.classList.remove('idle'); antenna.classList.add('hop');
  spawnStars();
  // 角标 ✓
  claudeBadge.textContent = '✓';
  claudeBadge.classList.add('show', 'done');

  if (curChannel().type === 'pomodoro') {
    renderPomo();                    // 番茄钟优先：只蹦跳+叮，倒计时不被盖
  } else if (!rolling && !showingResult && !celebrating) {
    // 屏幕显示开心脸 + ✓ 完成
    reel.classList.remove('sleeping'); reel.classList.add('idle', 'kaomoji');
    reel.style.fontSize = ''; reel.style.color = phosphor();
    reel.textContent = '＾▽＾';
    screen.classList.remove('dim', 'drowsy');
    phrase.style.opacity = 0;
    hint.textContent = '✓ 完成！'; hint.style.opacity = 0.85;
  }

  clearTimeout(claudeDone._t);
  claudeDone._t = setTimeout(() => {
    tv.classList.remove('hop');
    antenna.classList.remove('hop');
    antenna.classList.add('idle');
    claudeBadge.classList.remove('show', 'done');
    if (claudeState === 'idle' && !rolling && !showingResult && !celebrating) {
      if (curChannel().type === 'pomodoro') renderPomo(); else goIdle();
    }
  }, 2700);   // 6 × 0.42s ≈ 2.52s + 缓冲
}

// 完成时在屏幕里撒一圈星星
function spawnStars() {
  // 撒在整机外围（.stage 层，不被屏幕裁切）
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.textContent = '✨';
    s.style.left = (2 + Math.random() * 92) + '%';
    s.style.top = (2 + Math.random() * 90) + '%';
    s.style.animationDelay = (Math.random() * 2) + 's';
    stage.appendChild(s);
    setTimeout(() => s.remove(), 3000);
  }
}

// ===== 待机：番茄钟频道显示计时；其它频道显示心情表情 =====
function goIdle() {
  rolling = false;
  showingResult = false;
  updatePomoBtn();
  clearClaudeScreen();
  if (curChannel().type === 'pomodoro' && pomoFullActive()) {   // 番茄钟全屏 3s 优先
    clearInterval(idleTimer);
    renderPomo();
    return;
  }
  if (claudeState !== 'idle') {       // Claude 占主屏（任意频道）：主屏给 Claude，倒计时进顶部条
    clearInterval(idleTimer);
    claudeScreen();
    updatePomoMini();
    idleTimer = setInterval(idleTick, 1000);
    return;
  }
  updatePomoMini();                   // Claude 空闲：隐藏顶部条
  if (curChannel().type === 'pomodoro') { clearInterval(idleTimer); renderPomo(); return; }
  reel.classList.add('idle', 'kaomoji');
  antenna.classList.add('idle');
  reel.style.fontSize = '';            // 交回 .kaomoji 的字号
  phrase.style.opacity = 0;
  hint.style.opacity = 0.55;
  powerBtn.classList.remove('on');
  updateLabel();
  currentMood = null;                  // 强制下次 tick 重新评估心情并立即设脸
  clearInterval(idleTimer);
  idleTick();
  idleTimer = setInterval(idleTick, 1000);
}

// 首次/迁移：确保内置「求签」「番茄钟」频道存在
function ensureBuiltins(cfg) {
  if (!cfg.channels.some(c => c.type === 'fortune'))
    cfg.channels.unshift({ id: 'fortune', name: '求签', type: 'fortune' });
  if (!cfg.channels.some(c => c.type === 'pomodoro'))
    cfg.channels.push({ id: 'pomodoro', name: '番茄钟', type: 'pomodoro', focusMin: 25, breakMin: 5 });
}

// ===== 抽签 / 抽选（通用：求签 or 列表）=====
function draw() {
  if (rolling) return;
  clearClaudeScreen();
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

// ===== 换台（跳过番茄钟）/ 换肤 =====
let prevChannel = 0;   // 进番茄钟前所在频道，便于一键返回

function switchChannel(delta) {
  if (celebrating) endCelebrate();
  if (rolling) return;
  const list = rotatables();
  if (!list.length) return;
  let pos = list.indexOf(config.current);
  if (pos < 0) pos = (delta > 0 ? -1 : 0);   // 当前在番茄钟时，下一步落到首/末
  const next = (pos + delta + list.length) % list.length;
  config.current = list[next];
  persist();
  knobAngle.channel += (delta * 360) / list.length;   // 累计角度 → 始终顺时针
  setKnob(knobChannel, knobAngle.channel, true);
  updateLabel();
  updatePomoBtn();               // 离开番茄钟 → 侧键弹起
  screen.classList.add('rolling');
  beep(180, 0.05, 'sawtooth', 0.03);
  setTimeout(() => screen.classList.remove('rolling'), 220);
  showBanner(curChannel().name, goIdle);
}

// 🍅 专属按钮：进入番茄钟（全屏启动 3s 再缩到右上角）；已在番茄钟则返回原频道
function togglePomodoro() {
  if (celebrating) endCelebrate();
  markActive();
  const pi = config.channels.findIndex(c => c.type === 'pomodoro');
  if (pi < 0 || rolling) return;
  beep(660, 0.05, 'sine', 0.04);

  if (curChannel().type === 'pomodoro') {
    // 退出 → 回上一个频道
    let back = clamp(prevChannel, 0, config.channels.length - 1);
    if (!config.channels[back] || config.channels[back].type === 'pomodoro') back = rotatables()[0] ?? 0;
    config.current = back;
    pomoFullUntil = 0;
    syncKnobs();
    persist();
    updateLabel();
    updatePomoBtn();
    showBanner(curChannel().name, goIdle);
    return;
  }

  // 进入 → 启动 + 全屏 3 秒，再缩到右上角（即使 Claude 在忙也先全屏出现）
  prevChannel = config.current;
  config.current = pi;
  persist();
  updateLabel();
  updatePomoBtn();
  pomoFullUntil = Date.now() + 3000;
  if (pomo.phase === 'idle') pomoStartPhase('focus');   // 启动专注计时
  else pomoTickRender();
  clearClaudeScreen();
  renderPomo();                                         // 全屏大倒计时
  clearTimeout(togglePomodoro._t);
  togglePomodoro._t = setTimeout(() => { pomoFullUntil = 0; goIdle(); }, 3000);
}
function switchTheme(delta) {
  if (celebrating) endCelebrate();
  if (rolling) return;
  const n = allThemes().length;
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
// 屏幕：番茄钟频道=开始/暂停；其它=抽 / 再抽一次
function onScreenClick() {
  if (celebrating) { endCelebrate(); return; }   // 庆祝中点一下提前结束
  markActive();
  if (curChannel().type === 'pomodoro') { pomoToggle(); return; }
  if (!rolling) draw();
}
// 电源键：番茄钟频道=重置；其它=待机抽 / 结果复位
function onPowerClick() {
  if (celebrating) { endCelebrate(); return; }
  markActive();
  if (curChannel().type === 'pomodoro') { pomoReset(); return; }
  if (rolling) return;
  if (showingResult) goIdle();
  else draw();
}
screenWrap.addEventListener('click', onScreenClick);
powerBtn.addEventListener('click', (e) => { e.stopPropagation(); onPowerClick(); });

knobChannel.addEventListener('click', (e) => { e.stopPropagation(); markActive(); if (!rolling) switchChannel(1); });
knobTheme.addEventListener('click', (e) => { e.stopPropagation(); markActive(); switchTheme(1); });
pomoBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePomodoro(); });

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
  const h = Math.ceil(tv.getBoundingClientRect().height) + 76;  // 上下留余量，给完成时蹦跳/倾斜不被裁
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
  markActive();
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

// 鼠标靠近/移动到电视上 = 唤醒（让它对你的存在有反应）
let _lastMove = 0;
window.addEventListener('mousemove', () => {
  const n = Date.now();
  lastActive = n;
  if (n - _lastMove > 300) { _lastMove = n; markActive(); }
});

// ===== 设置面板保存后，热更新配置 =====
if (window.tvapi && window.tvapi.onConfigChanged) {
  window.tvapi.onConfigChanged((cfg) => {
    if (!cfg) return;
    config = cfg;
    ensureBuiltins(config);
    config.customThemes = config.customThemes || [];
    config.current = clamp(config.current || 0, 0, config.channels.length - 1);
    config.theme = clamp(config.theme || 0, 0, allThemes().length - 1);
    applyTheme(config.theme);
    syncKnobs();
    if (!rolling) goIdle();
  });
}

// 设置面板 DIY 实时预览（不落盘，仅临时套用）
if (window.tvapi && window.tvapi.onThemePreview) {
  window.tvapi.onThemePreview((obj) => {
    applyThemeObj(obj);
    if (!rolling && !showingResult) reel.style.color = phosphor();
  });
}

// Claude Code 状态：working / waiting 进入对应状态；done 弹完成提醒
if (window.tvapi && window.tvapi.onClaudeState) {
  window.tvapi.onClaudeState((s) => {
    if (s === 'done') claudeDone();
    else setClaudeState(s);
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
  } else {
    config = cfg;
  }
  config.customThemes = config.customThemes || [];
  const before = config.channels.length;
  ensureBuiltins(config);              // 老配置迁移：补上「番茄钟」等内置频道
  if (config.channels.length !== before || !cfg) persist();
  config.current = clamp(config.current || 0, 0, config.channels.length - 1);
  config.theme = clamp(config.theme || 0, 0, allThemes().length - 1);
  applyTheme(config.theme);
  syncKnobs();
  setRodLen(rodLen);
  goIdle();
}
init();
