import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;

  constructor() {
    // Initialize a single connection using environment variables
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
  }

  // Retrieve a value by key
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  // Set a key-value pair, with an optional Time-To-Live (TTL) in seconds
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.redisClient.set(key, value, 'EX', ttlSeconds);
    }
    return this.redisClient.set(key, value);
  }

  // Clean up the connection when the application shuts down
  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
