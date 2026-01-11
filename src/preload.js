import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  fetchTop8: (slug) => ipcRenderer.invoke('fetch-top8', slug),
  savePNG: (dataUrl) => ipcRenderer.invoke('save-png', dataUrl),
  readCache: () => ipcRenderer.invoke('read-cache'),
  writeCache: (map) => ipcRenderer.invoke('write-cache', map),
});