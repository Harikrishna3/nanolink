import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ClickProcessor } from './click.queue';

@Global()
@Module({
  imports: [
    // 1. Establish the underlying connection to Redis
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    
    // 2. Register the specific queue named "clicks"
    BullModule.registerQueue({
      name: 'clicks',
    }),
  ],
  providers: [ClickProcessor],
  // 3. Export the registered queue so other Modules (like UrlModule) can inject it!
  exports: [BullModule],
})
export class QueueModule {}
