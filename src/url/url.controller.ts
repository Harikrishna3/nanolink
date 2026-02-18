import { Body, Controller, Get, Post } from '@nestjs/common';
import { UrlService } from './url.service';
import { CreateUrlDto } from './dto/create-url.dto';

@Controller('url')
export class UrlController {
    constructor(private readonly urlService: UrlService){}

    @Get('test')
    test() {
        return this.urlService.getTestMessage();
    }

    @Post('create')
    createUrl(@Body() createUrlDto: CreateUrlDto) {
        if (!createUrlDto || !createUrlDto.longUrl) {
            return { error: 'longUrl is required' };
        }
        return this.urlService.createUrl(createUrlDto.longUrl);
    }
}
