import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlService {
    getTestMessage(){
        return {
            message: "Hello from UrlService"
        }
    }
}
