import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';
import { normalizeUrl } from 'src/common/utils/url-normalizer';
import { encodeBase62 } from 'src/common/utils/base62';

@Injectable()
export class UrlService {

    private urls: Url[] = [];
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
      id: this.urls.length + 1,
      shortCode: encodeBase62(this.urls.length + 1),
      longUrl,
      clicks: 0,
      createdAt: new Date(),
      expiresAt: null,
      userID: 'default-user', // Included as it's required by your Url entity
    };
    
    this.urlMap.set(normalized, newUrl);
    this.urls.push(newUrl);
    return newUrl;
    }

    findByShortCode(shortCode: string): Url | undefined {
        return this.urls.find(url => url.shortCode === shortCode);
    }

    incrementClicks(shortCode: string): void {
        const url = this.findByShortCode(shortCode);
        if (url) {
            url.clicks++;
        }
    }
}
