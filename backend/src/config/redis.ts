import { createClient } from 'redis';
import { logger } from '../middleware/logger';

const redisClient = createClient({
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

redisClient.on('error', (err) => {
    logger.error({ error: err }, 'Redis Client Error');
});

redisClient.on('connect', () => {
    logger.info('Redis Client Connected');
});

redisClient.on('ready', () => {
    logger.info('Redis Client Ready');
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        logger.error({ error }, 'Failed to connect to Redis');
    }
})();

export default redisClient;
