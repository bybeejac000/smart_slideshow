import fs from "node:fs";

const PHOTOS_PATH =
  process.env.PHOTOS_PATH ||
  "C:/Users/jakeb/Downloads/ring_doorbell/doorbell_frames";
export class PhotoHelper {
  async getList(): Promise<string[]> {
    if (!PHOTOS_PATH) throw new Error("PAHI:LJLKTH_TO_PHOTOS is not set");
    return fs
      .readdirSync(PHOTOS_PATH)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => `media://${PHOTOS_PATH}/${f}`);
  }
}
