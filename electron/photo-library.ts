import client from "./redis/redis";

const PHOTOS_LIST_KEY = process.env.PHOTOS_LIST_KEY;

export class PhotoLibrary {
  constructor() {
    (async () => {
      await client.connect();
    })();
  }

  async getList(): Promise<string[]> {
    if (!PHOTOS_LIST_KEY) throw new Error("PHOTOS_LIST_KEY is not set");
    const photoLinks = await client.lRange(PHOTOS_LIST_KEY, 0, -1);
    return photoLinks ? photoLinks : [];
  }
}
