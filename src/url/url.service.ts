import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';
import { normalizeUrl } from '../common/utils/url-normalizer';
import { encodeBase62 } from '../common/utils/base62';
import { idGenerator } from '../common/utils/id-generator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UrlService {
    constructor(private readonly prisma: PrismaService, private readonly redisService: RedisService) {}
    
    getTestMessage(){
        return {
            message: "Hello from UrlService"
        }
    }

    async createUrl(longUrl: string): Promise<Url> {
      const normalized = normalizeUrl(longUrl);
      const cacheKey = `url:long:${normalized}`;
      const cachedUrl = await this.redisService.get(cacheKey);
      if (cachedUrl) {
        console.log("CACHE HIT")
        return JSON.parse(cachedUrl);
      }
      
      const existingUrl = await this.prisma.url.findFirst({
        where: { longUrl: normalized }
      });

      if (existingUrl) {
        // Cache it for future hits!
        await this.redisService.set(cacheKey, JSON.stringify(existingUrl), 86400);
        return existingUrl as Url;
      }

      // Securely generate a collision-resistant short code from the time-based BigInt ID
      const uniqueId = idGenerator.nextId();
      
      const newUrl = await this.prisma.url.create({
        data: {
          id: uniqueId,
          shortCode: encodeBase62(uniqueId),
          longUrl: normalized,
          userID: 'default-user',
        }
      });
      
      // Cache the newly created URL for future hits!
      await this.redisService.set(cacheKey, JSON.stringify(newUrl), 86400);
      return newUrl as Url;
    }

    async findByShortCode(shortCode: string): Promise<Url | null> {
        const cacheKey = `url:short:${shortCode}`;
        const cachedUrl = await this.redisService.get(cacheKey);
        if (cachedUrl) {
            console.log("CACHE HIT")
            return JSON.parse(cachedUrl);
        }
        const url = await this.prisma.url.findUnique({
          where: { shortCode }
        }) as unknown as Promise<Url | null>;
        if (url) {
            await this.redisService.set(cacheKey, JSON.stringify(url), 86400);
        }

        console.log("DB HIT")
        return url;
    }

    async recordClick(urlId: any, shortCode: string, ip: string, userAgent: string): Promise<void> {
        // Run both database operations concurrently to minimize background load
        await Promise.all([
            // 1. Increment the total clicks counter on the Url
            this.prisma.url.update({
              where: { shortCode: shortCode },
              data: { clicks: { increment: 1 } }
            }),
            // 2. Insert the detailed click analytics record
            this.prisma.click.create({
              data: {
                urlId: urlId,
                ip: ip,
                userAgent: userAgent,
              }
            })
        ]);
    }
}
