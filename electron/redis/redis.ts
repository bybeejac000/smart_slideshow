import { createClient } from "redis";

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;

if (!REDIS_HOST || !REDIS_PORT)
  throw new Error("REDIS_HOST or REDIS_PORT is not set");

const client = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
});

export default client;
