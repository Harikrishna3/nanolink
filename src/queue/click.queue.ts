import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('clicks')
export class ClickProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { urlId, shortCode, ip, userAgent } = job.data;

    console.log(`Processing click for ${shortCode}...`);

    try {
      // 1. Insert the detailed click analytics record as the single source of truth
      await this.prisma.click.create({
        data: {
          urlId: urlId,
          ip: ip,
          userAgent: userAgent,
        },
      });
      console.log(`Successfully recorded click for ${shortCode}`);
    } catch (error) {
      console.error(`Failed to record click for ${shortCode}:`, error);
      throw error; // Let BullMQ handle retries if configured
    }
  }
}
