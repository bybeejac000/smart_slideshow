import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("photoHelper", {
  getList: () => ipcRenderer.invoke("get-photos"),
});
