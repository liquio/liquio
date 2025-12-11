import * as schedule from 'node-schedule';

import { BaseService } from './base_service';

export class SchedulerService extends BaseService {
  private readonly jobs: schedule.Job[] = [];

  async init(): Promise<void> {
    let rule = new schedule.RecurrenceRule();
    rule.hour = 3;
    rule.minute = 25;

    this.jobs.push(
      schedule.scheduleJob(rule, async () => {
        const count = await this.model('confirmCode').destroy({ truncate: true });
        this.log.save(`${SchedulerService.name}|confirm-code-cleanup`, { count }, 'info');
      }),
    );
  }

  async stop(): Promise<void> {
    for (const job of this.jobs) {
      job.cancel();
    }
  }
}
