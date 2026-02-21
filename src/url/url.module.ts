import { Module } from '@nestjs/common';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [UrlController],
  providers: [UrlService, RedisService]
})
export class UrlModule {}
