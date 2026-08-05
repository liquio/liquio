const crypto = require('crypto');

const EventModel = require('../models/event');

// Constants.
const LOCK_ID_BYTES_LENGTH = 20;

/**
 * Running Events.
 */
class RunningEvents {
  /**
   * Constructor.
   *
   * @param {EventModel} eventModel The Event model.
   */
  constructor(eventModel) {
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
  async lockAndGetRunningEvents() {
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
  generateLockId() {
    return crypto.randomBytes(LOCK_ID_BYTES_LENGTH).toString('hex');
  }
}

module.exports = RunningEvents;
