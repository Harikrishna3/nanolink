import { Body, Controller, Get, Param, Post, Res, Req } from '@nestjs/common';
import * as express from 'express';
import { UrlService } from './url.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('url')
export class UrlController {
    constructor(private readonly urlService: UrlService) { }

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

    @SkipThrottle()
    @Get(':code')
    async redirect(@Param('code') code: string, @Req() req: express.Request, @Res() res: express.Response) {
        const url = await this.urlService.findByShortCode(code);
        if (!url || !url.longUrl) {
            return res.status(404).json({ message: 'Link not found' });
        }

        // Fire and forget: add click analytics job to the background queue
        // We now pass the direct DB ID for maximum performance
        this.urlService.recordClick(
            url.id as bigint,
            req.ip || '',
            req.headers['user-agent'] || ''
        ).catch(err => console.error("Failed to enqueue click job:", err));

        return res.redirect(url.longUrl);
    }
}
