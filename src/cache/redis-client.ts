import { createClient, type RedisClientType } from "redis";
import { currentEnvironment } from "../config/environment.js";
import { systemLogger } from "../utils/logger.js";

let redisClientInstance: RedisClientType | null = null;
let isRedisAvailable = false;
let hasAttemptedConnection = false;
const inMemoryFallbackCache = new Map<string, string>();

export const getRedisClient = async (): Promise<RedisClientType | null> => {
  // In test mode without explicit real Redis testing flag, immediately use in-memory fallback
  if (currentEnvironment.NODE_ENV === "test" && !process.env["TEST_WITH_REAL_REDIS"]) {
    return null;
  }

  if (isRedisAvailable && redisClientInstance !== null) {
    return redisClientInstance;
  }

  if (hasAttemptedConnection && !isRedisAvailable) {
    return null;
  }

  hasAttemptedConnection = true;
  const redisConnectionUrl = currentEnvironment.REDIS_URL;

  try {
    const candidateClient = createClient({
      url: redisConnectionUrl,
      socket: {
        connectTimeout: 1000,
        reconnectStrategy: false,
      },
    }) as RedisClientType;

    candidateClient.on("error", (redisError: Error) => {
      systemLogger.warn("Redis client connection error. Falling back to in-memory cache.", {
        errorMessage: redisError.message,
      });
      isRedisAvailable = false;
    });

    candidateClient.on("ready", () => {
      systemLogger.info("Redis hot-cache connection established and ready.");
      isRedisAvailable = true;
    });

    await candidateClient.connect();
    redisClientInstance = candidateClient;
    isRedisAvailable = true;
    return redisClientInstance;
  } catch (connectionFailure) {
    systemLogger.warn(
      "Could not connect to Redis server. In-memory hot cache fallback will be active.",
      {
        errorMessage:
          connectionFailure instanceof Error
            ? connectionFailure.message
            : String(connectionFailure),
      },
    );
    isRedisAvailable = false;
    return null;
  }
};

export const getCacheValue = async (cacheKey: string): Promise<string | null> => {
  try {
    const activeRedisClient = await getRedisClient();
    if (activeRedisClient !== null && isRedisAvailable) {
      const redisResult = await activeRedisClient.get(cacheKey);
      return redisResult;
    }
  } catch (redisReadError) {
    systemLogger.warn(`Redis GET failed for key '${cacheKey}'. Checking in-memory fallback.`, {
      errorMessage:
        redisReadError instanceof Error ? redisReadError.message : String(redisReadError),
    });
  }

  const inMemoryResult = inMemoryFallbackCache.get(cacheKey) ?? null;
  return inMemoryResult;
};

export const setCacheValue = async (
  cacheKey: string,
  cacheValue: string,
  timeToLiveSeconds?: number,
): Promise<void> => {
  inMemoryFallbackCache.set(cacheKey, cacheValue);

  try {
    const activeRedisClient = await getRedisClient();
    if (activeRedisClient !== null && isRedisAvailable) {
      if (timeToLiveSeconds !== undefined && timeToLiveSeconds > 0) {
        await activeRedisClient.set(cacheKey, cacheValue, { EX: timeToLiveSeconds });
      } else {
        await activeRedisClient.set(cacheKey, cacheValue);
      }
    }
  } catch (redisWriteError) {
    systemLogger.warn(`Redis SET failed for key '${cacheKey}'. Saved to in-memory fallback only.`, {
      errorMessage:
        redisWriteError instanceof Error ? redisWriteError.message : String(redisWriteError),
    });
  }
};

export const deleteCacheValue = async (cacheKey: string): Promise<void> => {
  inMemoryFallbackCache.delete(cacheKey);

  try {
    const activeRedisClient = await getRedisClient();
    if (activeRedisClient !== null && isRedisAvailable) {
      await activeRedisClient.del(cacheKey);
    }
  } catch (redisDeleteError) {
    systemLogger.warn(`Redis DEL failed for key '${cacheKey}'.`, {
      errorMessage:
        redisDeleteError instanceof Error ? redisDeleteError.message : String(redisDeleteError),
    });
  }
};

export const clearInMemoryFallbackCache = (): void => {
  inMemoryFallbackCache.clear();
};
