const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('krypt', Object.freeze({
  load: () => ipcRenderer.invoke('krypt:load'),
  save: data => ipcRenderer.invoke('krypt:save', data),
  exportData: language => ipcRenderer.invoke('krypt:export', language),
  importData: language => ipcRenderer.invoke('krypt:import', language),
  chooseDataDirectory: language => ipcRenderer.invoke('krypt:choose-directory', language),
  showDataDirectory: () => ipcRenderer.invoke('krypt:show-directory'),
  getDataDirectory: () => ipcRenderer.invoke('krypt:get-directory')
}))
