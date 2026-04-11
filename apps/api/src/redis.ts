import Redis from "ioredis";
import { config } from "./config.js";

export const redis = config.redisUrl
  ? new Redis(config.redisUrl)
  : null;