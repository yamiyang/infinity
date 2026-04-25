import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getNextUrl: () => ipcRenderer.invoke("get-next-url"),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on("maximize-change", (_, maximized) => callback(maximized));
  },
});

// Mark window as Electron for runtime detection
contextBridge.exposeInMainWorld("__ELECTRON__", true);
