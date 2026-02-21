import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';

@Processor('clicks-dlq')
export class ClickDlqProcessor extends WorkerHost {
    private readonly logPath = path.join(process.cwd(), 'failed-clicks.json');

    async process(job: Job<any, any, string>): Promise<any> {
        const failedJobData = {
            id: job.id,
            name: job.name,
            data: job.data,
            failedReason: job.failedReason,
            timestamp: new Date().toISOString(),
        };

        console.error(`[DLQ] Processing failed job ${job.id} for queue 'clicks'`);

        try {
            let logs: any[] = [];
            if (fs.existsSync(this.logPath)) {
                const fileContent = fs.readFileSync(this.logPath, 'utf8');
                logs = JSON.parse(fileContent || '[]');
            }

            logs.push(failedJobData);

            fs.writeFileSync(this.logPath, JSON.stringify(logs, null, 2));
            console.log(`[DLQ] Logged failed job to ${this.logPath}`);
        } catch (error) {
            console.error(`[DLQ] Failed to write to DLQ log file:`, error);
        }
    }
}
