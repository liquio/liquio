import crypto from 'node:crypto';
import EventModel from '../models/event';

// Constants.
const LOCK_ID_BYTES_LENGTH = 20;

/**
 * Running Events.
 */
export class RunningEvents {
  eventModel: any;

  /**
   * Constructor.
   *
   * @param {EventModel} eventModel The Event model.
   */
  constructor(eventModel: any) {
    // Check.
    if (!(eventModel instanceof EventModel)) {
      throw new Error('Invalid Event model');
    }

    // Save.
    this.eventModel = eventModel;
  }

  /**
   * Lock and get running events.
   * @returns {Promise<EventEntity[]>} Running events promise.
   */
  async lockAndGetRunningEvents(): Promise<any[]> {
    // Lock running events.
    const lockId = this.generateLockId();
    await this.eventModel.lockRunningEvents(lockId);

    // Get running events.
    return await this.eventModel.getRunningEvents(lockId);
  }

  /**
   * Generate lock ID.
   * @returns {string} Lock ID.
   */
  generateLockId(): string {
    return crypto.randomBytes(LOCK_ID_BYTES_LENGTH).toString('hex');
  }
}
