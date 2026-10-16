'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (p) => ipcRenderer.invoke('file:save', p),
  aiChat: (p) => ipcRenderer.invoke('ai:chat', p),
  aiCancel: (id) => ipcRenderer.send('ai:cancel', id),
  onAi: (cb) => ipcRenderer.on('ai:event', (_e, d) => cb(d)),
  onCloseRequest: (cb) => ipcRenderer.on('app:close-request', () => cb()),
  closeOk: () => ipcRenderer.send('app:close-ok')
});
