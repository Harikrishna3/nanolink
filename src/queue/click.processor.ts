import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('clicks', { concurrency: 50 })
export class ClickProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { urlId, ip, userAgent } = job.data;

    console.log(`[Queue] Processing click for URL ID: ${urlId}...`);

    try {
      // 1. Insert the detailed click analytics record directly using urlId
      // No more DB lookup for shortCode -> urlId mapping!
      await this.prisma.click.create({
        data: {
          urlId: BigInt(urlId),
          ip: ip,
          userAgent: userAgent,
        },
      });
      console.log(`[Queue] Successfully recorded click for URL ID ${urlId}`);
    } catch (error) {
      console.error(`[Queue] Failed to record click for URL ID ${urlId}:`, error);
      throw error; // Let BullMQ handle retries if configured
    }
  }
}
