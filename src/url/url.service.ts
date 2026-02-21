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
      
      const existingUrl = await this.prisma.url.findFirst({
        where: { longUrl: normalized }
      });

      if (existingUrl) {
        // Cache it for future hits so redirect can find it by shortCode!
        await this.redisService.set(`url:short:${existingUrl.shortCode}`, existingUrl.longUrl, 86400);
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
      
      // Cache the newly created URL for future hits so redirect can find it by shortCode!
      await this.redisService.set(`url:short:${newUrl.shortCode}`, newUrl.longUrl, 86400);
      return newUrl as Url;
    }

    async findByShortCode(shortCode: string): Promise<Url | null> {
        const cacheKey = `url:short:${shortCode}`;
        const cachedLongUrl = await this.redisService.get(cacheKey);
        if (cachedLongUrl) {
            console.log("CACHE HIT")
            // Return only what the redirect endpoint needs
            return {
                shortCode,
                longUrl: cachedLongUrl,
            } as Url;
        }
        const url = await this.prisma.url.findUnique({
          where: { shortCode }
        }) as unknown as Promise<Url | null>;
        if (url) {
            await this.redisService.set(cacheKey, (url as unknown as { longUrl: string }).longUrl, 86400);
        }

        console.log("DB HIT")
        return url;
    }

    recordClick(urlId: any, shortCode: string, ip: string, userAgent: string): void {
        // Schedule the DB operations on the next tick of the event loop
        // This ensures the redirect response is sent instantly without waiting for Prisma scheduling
        setImmediate(() => {
            this.recordClickInternal(urlId, shortCode, ip, userAgent)
              .catch(err => console.error("Failed to record click:", err));
        });
    }

    private async recordClickInternal(urlId: any, shortCode: string, ip: string, userAgent: string): Promise<void> {
        // Insert the detailed click analytics record as the single source of truth
        await this.prisma.click.create({
            data: {
              urlId: urlId,
              ip: ip,
              userAgent: userAgent,
            }
        });
    }
}
