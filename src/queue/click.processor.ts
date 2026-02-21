import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('clicks', { concurrency: 50 })
export class ClickProcessor extends WorkerHost implements OnApplicationShutdown {
  private buffer: any[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly SAFETY_MAX_BUFFER = 50000;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_ITEM_RETRIES = 3;
  private flushTimer: NodeJS.Timeout;
  private isFlushing = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('clicks-dlq') private readonly dlqQueue: Queue
  ) {
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

    // Safety Valve: If buffer is at hard limit, drop oldest to prevent OOM
    if (this.buffer.length >= this.SAFETY_MAX_BUFFER) {
      const dropped = this.buffer.shift();
      console.warn(`[Queue] SAFETY LIMIT REACHED (${this.SAFETY_MAX_BUFFER}). Dropping oldest click to DLQ.`);
      this.dlqQueue.add('dropped-click', { ...dropped, urlId: dropped.urlId?.toString(), droppedAt: new Date().toISOString() })
        .catch(err => console.error("[Queue] Failed to move dropped click to DLQ:", err));
    }

    this.buffer.push({
      urlId: BigInt(urlId),
      ip: ip,
      userAgent: userAgent,
      retryCount: 0,
    });

    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      setImmediate(() => this.flushBuffer());
    }
  }

  private async flushBuffer() {
    if (this.isFlushing || this.buffer.length === 0) return;
    this.isFlushing = true;

    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    console.log(`[Queue] Flushing ${itemsToFlush.length} clicks to database...`);

    try {
      // Strip retryCount before sending to Prisma
      const dataToInsert = itemsToFlush.map(({ retryCount, ...rest }) => rest);
      await this.prisma.click.createMany({
        data: dataToInsert,
      });
      console.log(`[Queue] Successfully flushed ${itemsToFlush.length} clicks`);
    } catch (error) {
      console.error(`[Queue] Failed to flush clicks:`, error);

      const itemsProcessed = itemsToFlush.map(item => ({
        ...item,
        retryCount: (item.retryCount || 0) + 1,
      }));

      const toDlq = itemsProcessed.filter(item => item.retryCount > this.MAX_ITEM_RETRIES);
      const candidatesToRestore = itemsProcessed.filter(item => item.retryCount <= this.MAX_ITEM_RETRIES);

      // Handle safety limit for candidates
      const spaceLeft = this.SAFETY_MAX_BUFFER - this.buffer.length;
      const restoreCount = Math.max(0, Math.min(candidatesToRestore.length, spaceLeft));

      const restorable = candidatesToRestore.slice(0, restoreCount);
      const overflow = candidatesToRestore.slice(restoreCount);

      // Total to DLQ = already exceeded retries + overflow
      const totalToDlq = [...toDlq, ...overflow];

      if (totalToDlq.length > 0) {
        console.warn(`[Queue] ${totalToDlq.length} items dropped to DLQ (max retries or buffer full).`);
        this.dlqQueue.addBulk(
          totalToDlq.map(item => ({
            name: 'failed-click',
            data: { ...item, urlId: item.urlId?.toString(), failedAt: new Date().toISOString() }
          }))
        ).catch(err => console.error("[Queue] Failed to move items to DLQ:", err));
      }

      if (restorable.length > 0) {
        console.log(`[Queue] Restoring ${restorable.length} clicks to buffer for retry...`);
        this.buffer.unshift(...restorable);
      }
    } finally {
      this.isFlushing = false;
    }
  }
}
