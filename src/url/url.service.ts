import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';
import { normalizeUrl } from 'src/common/utils/url-normalizer';

@Injectable()
export class UrlService {

    private urlMap: Map<string, Url> = new Map()
    
    getTestMessage(){
        return {
            message: "Hello from UrlService"
        }
    }
    createUrl(longUrl: string):Url {

      const normalized = normalizeUrl(longUrl);
      if (this.urlMap.has(normalized)) {
        return this.urlMap.get(normalized)!;
      }
      const newUrl: Url = {
      id: this.urlMap.size + 1,
      shortCode: Math.random().toString(36).substring(2, 8),
      longUrl,
      clicks: 0,
      createdAt: new Date(),
      expiresAt: null,
      userID: 'default-user', // Included as it's required by your Url entity
    };
    
    this.urlMap.set(normalized, newUrl);
    return newUrl;
    }

    findByShortCode(shortCode: string): Url | undefined {
        return this.urlMap.get(shortCode);
    }

    incrementClicks(shortCode: string): void {
        const url = this.findByShortCode(shortCode);
        if (url) {
            url.clicks++;
        }
    }
}
