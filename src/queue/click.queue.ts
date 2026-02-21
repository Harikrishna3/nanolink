import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ClickQueue {
  constructor(@InjectQueue('clicks') private readonly clickQueue: Queue) {}

  async addClickJob(data: { shortCode: string; ip: string; userAgent: string; }) {
    await this.clickQueue.add('record-click', data, {
      removeOnComplete: true,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
