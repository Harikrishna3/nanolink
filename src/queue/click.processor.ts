import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('clicks', { concurrency: 50 })
export class ClickProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { shortCode, ip, userAgent } = job.data;

    console.log(`[Queue] Processing click for ${shortCode}...`);

    try {
      // 1. Fetch the URL from the database asynchronously (removed from redirect hot-path!)
      const url = await this.prisma.url.findUnique({
        where: { shortCode }
      });

      if (!url) {
        console.warn(`[Queue] URL not found for shortCode ${shortCode}. Skipping click record.`);
        return;
      }

      // 2. Insert the detailed click analytics record
      await this.prisma.click.create({
        data: {
          urlId: url.id,
          ip: ip,
          userAgent: userAgent,
        },
      });
      console.log(`[Queue] Successfully recorded click for ${shortCode}`);
    } catch (error) {
      console.error(`[Queue] Failed to record click for ${shortCode}:`, error);
      throw error; // Let BullMQ handle retries if configured
    }
  }
}
