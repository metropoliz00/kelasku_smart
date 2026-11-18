const { contextBridge, ipcRenderer } = require('electron');

const runtimeConfig = ipcRenderer.sendSync('kelasku:get-runtime-config') || {};

contextBridge.exposeInMainWorld('kelaskuDesktop', {
  isDesktop: true,
  platform: process.platform,
  appVersion: runtimeConfig.appVersion || '1.0.0',
  isPackaged: Boolean(runtimeConfig.isPackaged),
  initialGasUrl: runtimeConfig.gasUrl || '',
  initialLocalMode: Boolean(runtimeConfig.localMode),
  configPath: runtimeConfig.configPath || '',
  externalUrlFilePath: runtimeConfig.externalUrlFilePath || '',
  getGasUrl: () => ipcRenderer.invoke('kelasku:get-gas-url'),
  setGasUrl: (url) => ipcRenderer.invoke('kelasku:set-gas-url', url),
  setLocalMode: (enabled) => ipcRenderer.invoke('kelasku:set-local-mode', enabled),
  resetGasUrl: () => ipcRenderer.invoke('kelasku:reset-gas-url'),
  checkForUpdates: () => ipcRenderer.invoke('kelasku:check-updates'),
  installUpdate: () => ipcRenderer.invoke('kelasku:install-update'),
  openExternal: (url) => ipcRenderer.invoke('kelasku:open-external', url),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('kelasku:update-status', listener);
    return () => ipcRenderer.removeListener('kelasku:update-status', listener);
  },
});
