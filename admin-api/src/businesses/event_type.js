/**
 * Event type business.
 */
class EventTypeBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!EventTypeBusiness.singleton) {
      this.config = config;
      EventTypeBusiness.singleton = this;
    }

    // Return singleton.
    return EventTypeBusiness.singleton;
  }

  /**
   * Get event types.
   * @returns {Promise<EventTypeEntity[]>}
   */
  async getAll() {
    return await models.eventType.getAll();
  }
}

module.exports = EventTypeBusiness;
