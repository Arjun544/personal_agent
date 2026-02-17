import redisClient from '../config/redis';
import { logger } from '../middleware/logger';

export class CacheService {
    /**
     * Get a value from cache
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            const data = await redisClient.get(key);
            if (!data) return null;
            logger.info({ key }, `Cache get success for key ${key}`);
            return JSON.parse(data) as T;
        } catch (error) {
            logger.error({ error, key }, `Cache get error for key ${key}`);
            return null;
        }
    }

    /**
     * Set a value in cache with optional TTL (in seconds)
     */
    static async set(key: string, value: any, ttl?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            if (ttl) {
                await redisClient.setEx(key, ttl, serialized);
            } else {
                await redisClient.set(key, serialized);
            }
            logger.info({ key }, `Cache set success for key ${key}`);
        } catch (error) {
            logger.error({ error, key }, `Cache set error for key ${key}`);
        }
    }

    /**
     * Delete a specific key from cache
     */
    static async delete(key: string): Promise<void> {
        try {
            await redisClient.del(key);
        } catch (error) {
            logger.error({ error, key }, `Cache delete error for key ${key}`);
        }
    }

    /**
     * Delete all keys matching a pattern
     */
    static async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            logger.error({ error, pattern }, `Cache delete pattern error for pattern ${pattern}`);
        }
    }

    /**
     * Check if a key exists in cache
     */
    static async exists(key: string): Promise<boolean> {
        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            logger.error({ error, key }, `Cache exists error for key ${key}`);
            return false;
        }
    }

    /**
     * Clear all cache
     */
    static async clear(): Promise<void> {
        try {
            await redisClient.flushAll();
        } catch (error) {
            logger.error({ error }, 'Cache clear error');
        }
    }
}
