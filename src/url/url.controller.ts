import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import * as express from 'express';
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
    async createUrl(@Body() createUrlDto: CreateUrlDto) {
        if (!createUrlDto || !createUrlDto.longUrl) {
            return { error: 'longUrl is required' };
        }
        return await this.urlService.createUrl(createUrlDto.longUrl);
    }

    @Get(':code')
    async redirect(@Param('code') code: string, @Res() res: express.Response) {
        const url = await this.urlService.findByShortCode(code);
        if (!url) {
            return res.status(404).json({ message: 'Link not found' });
        }
        await this.urlService.incrementClicks(code);
        return res.redirect((url as unknown as { longUrl: string }).longUrl);
    }
}
