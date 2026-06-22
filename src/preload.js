const { contextBridge, ipcRenderer } = require('electron');

// 给渲染进程暴露一个最小的安全接口
contextBridge.exposeInMainWorld('tvapi', {
  quit: () => ipcRenderer.send('app:quit'),
  // 滚轮缩放：传入正/负增量，主进程同步窗口与页面 zoom
  zoom: (delta) => ipcRenderer.send('win:zoom', delta),
  // 上报整机高度（含天线），主进程据此贴合窗口高度
  fit: (contentH) => ipcRenderer.send('win:fit', contentH),

  // ===== 配置（频道/主题/自定义选项）=====
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.send('config:save', cfg),
  onConfigChanged: (cb) => ipcRenderer.on('config:changed', (_e, cfg) => cb(cfg)),
  openSettings: () => ipcRenderer.send('settings:open'),
  // DIY 外观实时预览（不落盘）
  previewTheme: (obj) => ipcRenderer.send('theme:preview', obj),
  onThemePreview: (cb) => ipcRenderer.on('theme:preview', (_e, obj) => cb(obj)),

  // 标记当前是否运行在 Electron 里（浏览器预览时为 false）
  isElectron: true,
});
