const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  onMaximized: (callback) => ipcRenderer.on('window-maximized', callback),
  onUnmaximized: (callback) => ipcRenderer.on('window-unmaximized', callback)
});

contextBridge.exposeInMainWorld('tasksAPI', {
  read: () => ipcRenderer.invoke('tasks-read'),
  write: (tasks) => ipcRenderer.invoke('tasks-write', tasks)
});

contextBridge.exposeInMainWorld('notesAPI', {
  read: () => ipcRenderer.invoke('notes-read'),
  write: (notes) => ipcRenderer.invoke('notes-write', notes)
});
