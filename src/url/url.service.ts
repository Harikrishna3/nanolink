import { Injectable } from '@nestjs/common';
import { Url } from './entities/url.entity';

@Injectable()
export class UrlService {

    private urls: Url[] = [];
    
    getTestMessage(){
        return {
            message: "Hello from UrlService"
        }
    }
    createUrl(longUrl: string):Url {
      const newUrl: Url = {
      id: this.urls.length + 1,
      shortCode: Math.random().toString(36).substring(2, 8),
      longUrl,
      clicks: 0,
      createdAt: new Date(),
      expiresAt: null,
      userID: 'default-user', // Included as it's required by your Url entity
    };
    
    this.urls.push(newUrl);
    return newUrl;
    }
}
