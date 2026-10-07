import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (title: string, body: string) =>
    ipcRenderer.send('app:notification', { title, body }),
  setAlwaysOnTop: (alwaysOnTop: boolean) =>
    ipcRenderer.send('window:set-always-on-top', alwaysOnTop),
  setWindowSize: (width: number, height: number) =>
    ipcRenderer.send('window:set-size', { width, height }),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  onShortcutTrigger: (callback: () => void) =>
    ipcRenderer.on('shortcut:summon', () => callback()),
});
