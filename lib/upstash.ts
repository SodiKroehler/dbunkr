import { Redis } from "@upstash/redis";
import { Index } from "@upstash/vector";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const vectorUrl = process.env.UPSTASH_VECTOR_REST_URL;
const vectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error(
    "Missing Upstash Redis environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
  );
}

if (!vectorUrl || !vectorToken) {
  throw new Error(
    "Missing Upstash Vector environment variables: UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN",
  );
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

export const vector = new Index({
  url: vectorUrl,
  token: vectorToken,
});
