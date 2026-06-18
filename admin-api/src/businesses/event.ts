import { Exceptions } from '../exceptions';

// Constants.
const SEQUELIZE_CONSTRAINT_ERROR = 'SequelizeForeignKeyConstraintError';

/**
 * Event business.
 */
export class EventBusiness {
  private static singleton: EventBusiness;

  public config: object;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!EventBusiness.singleton) {
      this.config = config;
      EventBusiness.singleton = this;
    }

    // Return singleton.
    return EventBusiness.singleton;
  }

  /**
   * Create or update.
   * @param {EventEntity} eventEntity Event Entity.
   * @returns {Promise<EventEntity>}
   */
  async createOrUpdate(eventEntity) {
    return global.models.eventTemplate.create(eventEntity);
  }

  /**
   * Delete event by ID.
   * @param {number} id Event ID.
   * @returns {Promise<EventEntity>}
   */
  async deleteById(id) {
    try {
      return await global.models.eventTemplate.deleteById(id);
    } catch (error) {
      if (error.name === SEQUELIZE_CONSTRAINT_ERROR) {
        throw new Exceptions.WORKFLOW(Exceptions.WORKFLOW.Messages.CONSTRAINT);
      }

      throw error;
    }
  }

  /**
   * Find event by ID.
   * @param {number} id Event ID.
   * @returns {Promise<EventEntity>}
   */
  async findById(id) {
    return await global.models.eventTemplate.findById(id);
  }

  /**
   * @param {number} id Event ID.
   * @param {EventEntity} event
   * @returns {Promise<EventEntity>}
   */
  async updateById(id, event) {
    return await global.models.event.updateById(id, event);
  }
}
