import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';
import { normalizeUrl } from '../common/utils/url-normalizer';
import { encodeBase62 } from '../common/utils/base62';
import { idGenerator } from '../common/utils/id-generator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ClickQueue } from '../queue/click.queue';

@Injectable()
export class UrlService {
    constructor(
      private readonly prisma: PrismaService, 
      private readonly redisService: RedisService,
      private readonly clickQueue: ClickQueue
    ) {}
    
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

    async recordClick(shortCode: string, ip: string, userAgent: string): Promise<void> {
        // Delegate background pipeline submission to ClickQueue service
        // The queue processor will fetch the urlId asynchronously!
        await this.clickQueue.addClickJob({
            shortCode: shortCode,
            ip: ip,
            userAgent: userAgent,
        });
    }
}
