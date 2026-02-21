import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ClickQueue {
  constructor(@InjectQueue('clicks') private readonly clickQueue: Queue) { }

  async addClickJob(data: { urlId: string; ip: string; userAgent: string; }) {
    await this.clickQueue.add('record-click', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
