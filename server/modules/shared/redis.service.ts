import * as Redis from 'ioredis';
import { Service } from 'typedi';
import { environment } from '../../environment';

@Service()
export class RedisService {
    redisClient: Redis.Redis;

    constructor() {
        this.redisClient = new Redis(environment.redis as any);
    }

    async getKey(key: string) {
        return await this.redisClient.get(key);
    }

    async removeKey(key: string) {
        return await this.redisClient.del(key);
    }

}