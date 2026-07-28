import { BaseService } from './base_service';
import { Op } from 'sequelize';

const CLEANUP_MINUTES_INTERVAL = 10;

export class ConfirmCodeCleanupService extends BaseService {
  private intervalId: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    this.log.save('confirm-сode-сleanup-init', { intervalMinutes: CLEANUP_MINUTES_INTERVAL });

    this.intervalId = setInterval(
      async () => {
        try {
          const now = new Date();

          const deleted = await this.model('confirmCode').destroy({
            where: {
              expiresIn: {
                [Op.lt]: now,
              },
            },
          });

          if (deleted > 0) {
            this.log.save('confirm-сode-сleanup-deleted', { deleted });
          }
        } catch (error: any) {
          this.log.save('confirm-сode-сleanup-error', { error: error.toString() }, 'error');
        }
      },
      CLEANUP_MINUTES_INTERVAL * 60 * 1000,
    );
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.log.save('confirm-сode-сleanup-stop');
    }
  }
}
