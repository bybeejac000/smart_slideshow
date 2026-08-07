import { ipcMain } from "electron";
import { PhotoLibrary } from "./photo-library";

const photoLibrary = new PhotoLibrary();

export function registerIpcHandlers() {
  ipcMain.handle("get-photos", () => {
    return photoLibrary.getList();
  });

  ipcMain.handle("get-env-var", (_, key: string) => {
    return envVars[key] || null;
  });
}

const envVars: Record<string, string> = {
  PHOTOS_LIST_KEY: process.env.PHOTOS_LIST_KEY || "",
  GO_LISTEN_HOST: process.env.GO_LISTEN_HOST || "",
  GO_LISTEN_PORT: process.env.GO_LISTEN_PORT || "",
  REDIS_HOST: process.env.REDIS_HOST || "",
  REDIS_PORT: process.env.REDIS_PORT || "",
  IN_MEM_PIC_AMT: process.env.IN_MEM_PIC_AMT || "",
  IMMICH_URL: process.env.IMMICH_URL || "",
  IMMICH_RO_API_KEY: process.env.IMMICH_RO_API_KEY || "",
};
