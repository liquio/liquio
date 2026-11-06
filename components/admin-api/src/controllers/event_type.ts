import { Controller } from './controller';
import { EventTypeBusiness } from '../businesses/event_type';

/**
 * Event type controller.
 */
export class EventTypeController extends Controller {
  private static singleton: EventTypeController;
  private eventTypeBusiness: EventTypeBusiness;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!EventTypeController.singleton) {
      super(config);
      this.eventTypeBusiness = new EventTypeBusiness();
      EventTypeController.singleton = this;
    }
    return EventTypeController.singleton;
  }

  /**
   * Get all.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getAll(req, res) {
    let eventTypes;
    try {
      eventTypes = await this.eventTypeBusiness.getAll();
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, eventTypes);
  }
}
