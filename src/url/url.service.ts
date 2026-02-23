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
  ) { }

  getTestMessage() {
    return {
      message: "Hello from UrlService"
    }
  }

  async createUrl(longUrl: string): Promise<Url> {
    const normalized = normalizeUrl(longUrl);
    // Securely generate a collision-resistant short code from the time-based BigInt ID
    const uniqueId = idGenerator.nextId();
    const shortCode = encodeBase62(uniqueId);

    try {
      // 1. Try to assert creation directly using Database constraints
      const newUrl = await this.prisma.url.create({
        data: {
          id: uniqueId,
          shortCode: shortCode,
          longUrl: normalized,
          userID: 'default-user',
        }
      });

      // 2. We successfully created it! Now safely cache it.
      await this.redisService.set(
        `url:short:${newUrl.shortCode}`,
        JSON.stringify({ longUrl: newUrl.longUrl, id: newUrl.id.toString() }),
        86400
      );
      return newUrl as Url;
      
    } catch (error: any) {
      // 3. P2002 is the Prisma specific error for "Unique constraint failed"
      if (error.code === 'P2002' && error.meta?.target?.includes('longUrl')) {
        console.log(`[UrlService] URL already exists. Fetching existing entry...`);
        
        // Fetch the existing record
        const existingUrl = await this.prisma.url.findUnique({
          where: { longUrl: normalized }
        });

        if (existingUrl) {
          // Re-Cache it for future hits so redirect can find it again!
          await this.redisService.set(
            `url:short:${existingUrl.shortCode}`,
            JSON.stringify({ longUrl: existingUrl.longUrl, id: existingUrl.id.toString() }),
            86400
          );
          return existingUrl as Url;
        }
      }

      // If it wasn't a collision or findUnique somehow failed, panic bubble!
      throw error;
    }
  }

  async findByShortCode(shortCode: string): Promise<Url | null> {
    const cacheKey = `url:short:${shortCode}`;
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      console.log("CACHE HIT")
      try {
        const { longUrl, id } = JSON.parse(cachedData);
        // Return only what the redirect endpoint needs
        return {
          id: BigInt(id),
          shortCode,
          longUrl,
        } as unknown as Url;
      } catch (e) {
        console.error("Failed to parse cached URL data:", e);
        // Fallback to DB if cache is corrupted or in old format
      }
    }
    const url = await this.prisma.url.findUnique({
      where: { shortCode }
    });

    if (url) {
      await this.redisService.set(
        cacheKey,
        JSON.stringify({ longUrl: url.longUrl, id: url.id.toString() }),
        86400
      );
    }

    console.log("DB HIT")
    return url as Url | null;
  }

  async recordClick(urlId: bigint, ip: string, userAgent: string): Promise<void> {
    // Delegate background pipeline submission to ClickQueue service
    // We now pass the urlId directly!
    await this.clickQueue.addClickJob({
      urlId: urlId.toString(),
      ip: ip,
      userAgent: userAgent,
    });
  }

  async getAnalytics(shortCode: string) {
    const url = await this.prisma.url.findUnique({
      where: { shortCode },
      include: { stats: true },
    });

    if (!url) return null;

    return {
      shortCode: url.shortCode,
      longUrl: url.longUrl,
      totalClicks: url.stats?.totalClicks || 0,
      uniqueVisitors: url.stats?.uniqueVisitors || 0,
      lastUpdated: url.stats?.lastUpdated || null,
    };
  }
}
