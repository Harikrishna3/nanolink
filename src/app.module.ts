import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UrlModule } from './url/url.module';
import { PrismaModule } from './prisma/prisma.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisModule } from './redis/redis.module';
import { APP_GUARD } from '@nestjs/core';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds (in milliseconds)
      limit: 10,  // 10 requests allowed
    }]),
    UrlModule,
    PrismaModule,
    RedisModule,
    QueueModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD, // This makes the execution global
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
