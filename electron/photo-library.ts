import fs from "node:fs";

const PHOTOS_PATH = process.env.PHOTOS_PATH;

export class PhotoLibrary {
  async getList(): Promise<string[]> {
    return [
      "https://m.media-amazon.com/images/I/81eKN8JFO+L._SL1500_.jpg",
      "https://m.media-amazon.com/images/I/41fh3WWECQL._SY445_SX342_QL70_FMwebp_.jpg",
    ];
    if (!PHOTOS_PATH) throw new Error("PHOTOS_PATH is not set");
    return fs
      .readdirSync(PHOTOS_PATH)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => `media://${PHOTOS_PATH}/${f}`);
  }
}
