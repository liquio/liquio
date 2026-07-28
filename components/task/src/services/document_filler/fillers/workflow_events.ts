
import PropByPath from 'prop-by-path';
import { Filler } from './filler';
import { EventModel } from '../../../models/event';

/**
 * Workflow events filler. 
 */
export class WorkflowEventsFiller extends Filler {
  private static singleton: WorkflowEventsFiller;
  eventModel: any;

  constructor() {
    if (!WorkflowEventsFiller.singleton) {
      super();

      this.eventModel = new EventModel();
      WorkflowEventsFiller.singleton = this;
    }
    return WorkflowEventsFiller.singleton;
  }

  /**
   * Fill.
   * @param {object} schemaObject Schema object.
   * @param {object} objectToFill Object to fill.
   * @param {object} options Options.
   * @param {string} options.workflowId Workflow ID.
   * @param {object} [options.events] Events from current workflow.
   * @returns {object} Filled object.
   */
  async fill(schemaObject, objectToFill: any = {}, options: any = {}) {
    // Get options.
    const { workflowId, events } = options;

    // Check options.
    if (!workflowId) { return objectToFill; }

    // Handle all schema object pages.
    await this.handleAllElements(schemaObject, objectToFill, async (item, itemSchema) => {
      // Check current element shoudn't be defined.
      if (!itemSchema || typeof itemSchema.value !== 'string'
        || !itemSchema.value.startsWith('events.')) { return; }

      // Define current value.
      // Sample: "events.11.data.cancellation.text".
      const currentValue = itemSchema.value;

      // Define events property path.
      // Sample: "11.data.cancellation.text".
      const eventsPropertyPath = currentValue.split('.').slice(1).join('.');

      // Fill current element.
      let valueToSet;
      try {
        // Prepare events template IDs. Sort events from old to new to get last event with the same template ID.
        // Sample: { 11: { data: { cancellation: { text: "abc" } } } }.
        const eventsByTemplateIds: any = {};
        events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .forEach(v => eventsByTemplateIds[v.eventTemplateId] = v);

        // Define value to set.
        // Sample: "abc".
        valueToSet = PropByPath.get(eventsByTemplateIds, eventsPropertyPath);
        if (valueToSet === null) { valueToSet = undefined; }
      } catch (error) { global.log.save('workflow-event-field-filling-error', error, 'warn'); }

      // Return value to set.
      return valueToSet;
    });

    // Return filled object.
    return objectToFill;
  }
}

