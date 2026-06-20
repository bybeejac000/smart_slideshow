import Redis from "ioredis";

const client = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
});

export default client;
