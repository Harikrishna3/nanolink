import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ClickProcessor } from './click.processor';
import { ClickQueue } from './click.queue';
import { ClickDlqProcessor } from './click-dlq.processor';

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
    BullModule.registerQueue(
      { name: 'clicks' },
      { name: 'clicks-dlq' }
    ),
  ],
  providers: [ClickProcessor, ClickQueue, ClickDlqProcessor],
  // 3. Export the registered queue and ClickQueue so other Modules can inject it!
  exports: [BullModule, ClickQueue],
})
export class QueueModule { }
