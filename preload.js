const { contextBridge, ipcRenderer, webUtils } = require('electron')

function subscribe(channel, callback) {
  if (typeof callback !== 'function') throw new TypeError('事件处理器必须是函数。')
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('ffsync', {
  chooseFiles: (kind) => ipcRenderer.invoke('files:choose', kind),
  addDroppedFiles: (kind, fileList) => {
    const paths = []
    for (const file of Array.from(fileList || [])) {
      try {
        const filePath = webUtils.getPathForFile(file)
        if (filePath) paths.push(filePath)
      } catch {
        // The main process reports unavailable or unsupported paths per file.
      }
    }
    return ipcRenderer.invoke('files:add', kind, paths)
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  chooseFfs: () => ipcRenderer.invoke('settings:choose-ffs'),
  checkEnvironment: (ffsCommand) => ipcRenderer.invoke('environment:check', ffsCommand),
  runSync: (jobs) => ipcRenderer.invoke('sync:run', jobs),
  cancelSync: () => ipcRenderer.invoke('sync:cancel'),
  showOutput: (filePath) => ipcRenderer.invoke('output:show', filePath),
  onSyncEvent: (callback) => subscribe('sync:event', callback),
})

