import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';
import { normalizeUrl } from '../common/utils/url-normalizer';
import { encodeBase62 } from '../common/utils/base62';
import { idGenerator } from '../common/utils/id-generator';

@Injectable()
export class UrlService {

    private urlByNormalized = new Map<string, Url>();
    private urlByShortCode = new Map<string, Url>();
    
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

      // Securely generate a collision-resistant short code from the time-based BigInt ID
      const uniqueId = idGenerator.nextId();
      
      const newUrl: Url = {
      id: uniqueId,
      shortCode: encodeBase62(uniqueId),
      longUrl,
      clicks: 0,
      createdAt: new Date(),
      expiresAt: null,
      userID: 'default-user', // Included as it's required by your Url entity
    };
    
    this.urlByNormalized.set(normalized, newUrl);
    this.urlByShortCode.set(newUrl.shortCode, newUrl);
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
