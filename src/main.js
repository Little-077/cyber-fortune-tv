const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// 应用名（菜单栏显示「赛博抽抽机」而非「Electron」）
app.setName('赛博抽抽机');

let win;          // 电视主窗口
let settingsWin;  // 设置窗口

// 配置文件（频道 / 主题 / 自定义选项）持久化到用户数据目录
function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf-8')); }
  catch (e) { return null; }
}
function writeConfig(cfg) {
  try { fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf-8'); }
  catch (e) { /* ignore */ }
}
function broadcastConfig(cfg, exceptWC) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (exceptWC && w.webContents.id === exceptWC.id) continue;
    w.webContents.send('config:changed', cfg);
  }
}

// 100% 缩放时的基准窗口尺寸；滚轮缩放在此基础上按比例伸缩
const BASE_W = 384;   // 略宽，给机身右侧凸起按钮留出空间
const MIN_SCALE = 0.45;
const MAX_SCALE = 1.8;
let scale = 0.8;               // 默认略小一点（之前“好大一个”）
let lastContentH = 360;        // 渲染进程上报的整机高度（含天线），用于贴合窗口

function createWindow() {
  const WIN_W = Math.round(BASE_W * scale);
  const WIN_H = Math.round(lastContentH * scale);

  // 默认放在主屏幕右下角，像桌宠一样待着
  const { workArea } = screen.getPrimaryDisplay();
  const x = workArea.x + workArea.width - WIN_W - 40;
  const y = workArea.y + workArea.height - WIN_H - 40;

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x,
    y,
    transparent: true,     // 透明背景，只露出电视
    frame: false,          // 无边框
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,     // 总是置顶
    fullscreenable: false,
    skipTaskbar: false,
    show: false,           // 等内容就绪再显示，避免透明窗口闪烁/不渲染
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 浮在所有普通窗口之上，并在所有桌面空间可见（桌宠感）
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.once('ready-to-show', () => win.show());

  // 内容加载后套用初始缩放，让整机视觉与窗口一致
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(scale);
  });

  // 关闭电视主窗口 = 退出整个应用
  win.on('closed', () => { win = null; app.quit(); });

  win.loadFile(path.join(__dirname, 'index.html'));
}

// ===== 设置窗口 =====
function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 480,
    height: 600,
    title: '赛博抽抽机 · 设置',
    resizable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// ===== IPC =====
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('settings:open', () => openSettings());

// DIY 预览：转发给电视主窗口实时套用
ipcMain.on('theme:preview', (_e, obj) => {
  if (win && !win.isDestroyed()) win.webContents.send('theme:preview', obj);
});

ipcMain.handle('config:get', () => readConfig());
ipcMain.on('config:save', (e, cfg) => {
  if (!cfg) return;
  writeConfig(cfg);
  broadcastConfig(cfg, e.sender);   // 通知其它窗口热更新（不回发给保存者）
});

// 贴合窗口：宽度按 BASE_W、高度按上报的整机高度；底边锚定（天线变长→窗口向上长）
function applyBounds() {
  if (!win) return;
  const w = Math.round(BASE_W * scale);
  const h = Math.round(lastContentH * scale);
  const b = win.getBounds();
  const cx = b.x + b.width / 2;
  const bottom = b.y + b.height;          // 保持底边不动
  win.setBounds({
    width: w,
    height: h,
    x: Math.round(cx - w / 2),
    y: Math.max(0, Math.round(bottom - h)),
  });
}

// 滚轮缩放：整页 zoom + 同步窗口尺寸（底边锚定、原地缩放）
ipcMain.on('win:zoom', (_e, delta) => {
  if (!win) return;
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
  win.webContents.setZoomFactor(scale);
  applyBounds();
});

// 渲染进程上报整机高度（含天线长度变化），贴合窗口
ipcMain.on('win:fit', (_e, contentH) => {
  if (typeof contentH === 'number' && contentH > 0) {
    lastContentH = contentH;
    applyBounds();
  }
});

app.whenReady().then(() => {
  // 运行时 Dock 图标也用电视图标
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, 'icon.png'));
  }

  // macOS 顶部菜单：保留 Cmd+Q / Cmd+W 等快捷键
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'quit' },
        ],
      },
      {
        label: '窗口',
        submenu: [{ role: 'close' }, { role: 'minimize' }],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
