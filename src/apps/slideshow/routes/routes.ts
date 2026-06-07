import { ipcMain } from "electron";
import { PhotoHelper } from "../helpers/photo_helpers";

const helper = new PhotoHelper();

export function registerRoutes() {
  ipcMain.handle("get-photos", () => {
    return helper.getList();
  });
}
