const StopResult = require('./stop_result');

/**
 * Event stopper.
 * @typedef {import('../../../models/task')} TaskModel Task model.
 * @typedef {import('../../../models/document')} DocumentModel Document model.
 * @typedef {import('../../../models/event')} EventModel Event model.
 */
class EventStopper {
  constructor(config) {
    // Define singleton.
    if (!EventStopper.singleton) {
      // Save params.
      this.config = config;

      // Set singleton.
      EventStopper.singleton = this;
    }

    // Return singleton.
    return EventStopper.singleton;
  }

  /**
   * Stop.
   * @param {string} workflowId Workflow ID.
   * @param {string} eventTemplateId Event template ID.
   * @param {TaskModel} taskModel Task model.
   * @param {DocumentModel} documentModel Document model.
   * @param {EventModel} eventModel Event model.
   * @param {string[]} taskTemplateIdsFilter Task template IDs filter.
   * @param {string[]} eventTemplateIdsFilter Event template IDs filter.
   * @returns {StopResult} Stop result.
   */
  async stop(workflowId, eventTemplateId, taskModel, documentModel, eventModel, taskTemplateIdsFilter, eventTemplateIdsFilter) {
    // Init stop result container.
    const stopResult = new StopResult(workflowId, taskTemplateIdsFilter, eventTemplateIdsFilter);

    // Stop tasks.
    await this.stopTasks(workflowId, taskModel, documentModel, taskTemplateIdsFilter, stopResult);

    // Stop events.
    await this.stopEvents(workflowId, eventModel, eventTemplateId, eventTemplateIdsFilter, stopResult);

    // Set stop result as handled and return.
    stopResult.setIsHandled();
    log.save('stop-result', stopResult);
    return stopResult;
  }

  /**
   * Stop tasks.
   * @param {string} workflowId Workflow ID.
   * @param {TaskModel} taskModel Task model.
   * @param {DocumentModel} documentModel Document model.
   * @param {string[]} taskTemplateIdsFilter Task template IDs filter.
   * @param {StopResult} stopResult Stop result instance to fill.
   */
  async stopTasks(workflowId, taskModel, documentModel, taskTemplateIdsFilter, stopResult) {
    try {
      const tasksInProgress = await taskModel.getTasksInProgress(workflowId);
      const tasksToStop = tasksInProgress.filter((v) => !Array.isArray(taskTemplateIdsFilter) || taskTemplateIdsFilter.includes(v.taskTemplateId));
      const tasksToStopIds = tasksToStop.map((v) => v.id);
      const documentStopIds = tasksToStop.map((v) => v.documentId);
      await taskModel.setCancelled(tasksToStopIds);
      await documentModel.setCancelled(documentStopIds);
      stopResult.addStoppedTaskIds(...tasksToStopIds);
    } catch (error) {
      log.save('stop-tasks-error', { error: error && error.message, stopResult });
      throw error;
    }
  }

  /**
   * Stop events.
   * @param {string} workflowId Wotkflow ID.
   * @param {EventModel} eventModel Event model.
   * @param {string} eventTemplateId Event template ID.
   * @param {string[]} eventTemplateIdsFilter Event template IDs filter.
   * @param {StopResult} stopResult Stop result instance to fill.
   */
  async stopEvents(workflowId, eventModel, eventTemplateId, eventTemplateIdsFilter, stopResult) {
    try {
      const eventsInProgress = await eventModel.getEventsInProgress(workflowId);
      const eventsToStop = eventsInProgress.filter(
        (v) =>
          v.eventTemplateId !== eventTemplateId && (!Array.isArray(eventTemplateIdsFilter) || eventTemplateIdsFilter.includes(v.eventTemplateId)),
      );
      const eventsToStopIds = eventsToStop.map((v) => v.id);
      await eventModel.setCancelled(eventsToStopIds);
      stopResult.addStoppedEventIds(...eventsToStopIds);
    } catch (error) {
      log.save('stop-events-error', { error: error && error.message, stopResult });
      throw error;
    }
  }
}

module.exports = EventStopper;
