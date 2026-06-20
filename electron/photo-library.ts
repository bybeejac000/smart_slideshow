import client from "./redis/redis";

export class PhotoLibrary {
  async getList(): Promise<string[]> {
    const key = process.env.PHOTOS_LIST_KEY;
    if (!key) throw new Error("PHOTOS_LIST_KEY is not set");
    const photoLinks = await client.lrange(key, 0, -1);
    return photoLinks ?? [];
  }
}
