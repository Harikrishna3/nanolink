import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';
import { normalizeUrl } from '../common/utils/url-normalizer';
import { encodeBase62 } from '../common/utils/base62';
import { idGenerator } from '../common/utils/id-generator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UrlService {
    constructor(private readonly prisma: PrismaService) {}
    
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
      
      return newUrl as Url;
    }

    async findByShortCode(shortCode: string): Promise<Url | null> {
        return this.prisma.url.findUnique({
          where: { shortCode }
        }) as unknown as Promise<Url | null>;
    }

    async incrementClicks(shortCode: string): Promise<void> {
        await this.prisma.url.update({
          where: { shortCode },
          data: { clicks: { increment: 1 } }
        });
    }
}
