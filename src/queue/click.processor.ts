import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('clicks', { concurrency: 50 })
export class ClickProcessor extends WorkerHost implements OnApplicationShutdown {
  private buffer: any[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.flushTimer = setInterval(() => this.flushBuffer(), this.FLUSH_INTERVAL);
  }

  async onApplicationShutdown(signal?: string) {
    console.log(`[Queue] Shutdown signal received (${signal}). Flushing buffer...`);
    clearInterval(this.flushTimer);
    await this.flushBuffer();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { urlId, ip, userAgent } = job.data;

    this.buffer.push({
      urlId: BigInt(urlId),
      ip: ip,
      userAgent: userAgent,
    });

    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  private async flushBuffer() {
    if (this.buffer.length === 0) return;

    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    console.log(`[Queue] Flushing ${itemsToFlush.length} clicks to database...`);

    try {
      await this.prisma.click.createMany({
        data: itemsToFlush,
      });
      console.log(`[Queue] Successfully flushed ${itemsToFlush.length} clicks`);
    } catch (error) {
      console.error(`[Queue] Failed to flush clicks:`, error);
      // In a real production app, you might want to push these back to the buffer 
      // or to a dead-letter queue, but for now we'll log it.
    }
  }
}
