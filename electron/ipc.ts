import { ipcMain } from "electron";
import { PhotoLibrary } from "./photo-library";

const photoLibrary = new PhotoLibrary();

export function registerIpcHandlers() {
  ipcMain.handle("get-photos", () => {
    return photoLibrary.getList();
  });
}
