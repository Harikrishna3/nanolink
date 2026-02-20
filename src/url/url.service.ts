import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';
import { normalizeUrl } from 'src/common/utils/url-normalizer';
import { encodeBase62 } from 'src/common/utils/base62';

@Injectable()
export class UrlService {

    private urlByNormalized = new Map<string, Url>();
    private urlByShortCode = new Map<string, Url>();
    private nextId = 1;
    
    getTestMessage(){
        return {
            message: "Hello from UrlService"
        }
    }
    createUrl(longUrl: string):Url {

      const normalized = normalizeUrl(longUrl);
      if (this.urlByNormalized.has(normalized)) {
        return this.urlByNormalized.get(normalized)!;
      }
      const newUrl: Url = {
      id: this.nextId,
      shortCode: encodeBase62(this.nextId),
      longUrl,
      clicks: 0,
      createdAt: new Date(),
      expiresAt: null,
      userID: 'default-user', // Included as it's required by your Url entity
    };
    
    this.urlByNormalized.set(normalized, newUrl);
    this.urlByShortCode.set(newUrl.shortCode, newUrl);
    this.nextId++;
    return newUrl;
    }

    findByShortCode(shortCode: string): Url | undefined {
        return this.urlByShortCode.get(shortCode);
    }

    incrementClicks(shortCode: string): void {
        const url = this.findByShortCode(shortCode);
        if (url) {
            url.clicks++;
        }
    }
}
