import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("photoHelper", {
  getList: () => ipcRenderer.invoke("get-photos"),
});
contextBridge.exposeInMainWorld("getEnvVar", (key: string) => {
  return ipcRenderer.invoke("get-env-var", key);
});
