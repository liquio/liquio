import { StopResult } from './stop_result';

/**
 * Event stopper.
 * @typedef {import('../../../models/task').TaskModel} TaskModel Task model.
 * @typedef {import('../../../models/document').DocumentModel} DocumentModel Document model.
 * @typedef {import('../../../models/event').EventModel} EventModel Event model.
 */
export class EventStopper {
  static singleton: EventStopper;

  config: any;

  constructor(config: any) {
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
  async stop(
    workflowId: string,
    eventTemplateId: string,
    taskModel: any,
    documentModel: any,
    eventModel: any,
    taskTemplateIdsFilter: string[],
    eventTemplateIdsFilter: string[],
  ): Promise<StopResult> {
    // Init stop result container.
    const stopResult = new StopResult(workflowId, taskTemplateIdsFilter, eventTemplateIdsFilter);

    // Stop tasks.
    await this.stopTasks(workflowId, taskModel, documentModel, taskTemplateIdsFilter, stopResult);

    // Stop events.
    await this.stopEvents(workflowId, eventModel, eventTemplateId, eventTemplateIdsFilter, stopResult);

    // Set stop result as handled and return.
    stopResult.setIsHandled();
    global.log.save('stop-result', stopResult);
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
  async stopTasks(workflowId: string, taskModel: any, documentModel: any, taskTemplateIdsFilter: string[], stopResult: StopResult): Promise<void> {
    try {
      const tasksInProgress = await taskModel.getTasksInProgress(workflowId);
      const tasksToStop = tasksInProgress.filter(
        (v: any) => !Array.isArray(taskTemplateIdsFilter) || taskTemplateIdsFilter.includes(v.taskTemplateId),
      );
      const tasksToStopIds = tasksToStop.map((v: any) => v.id);
      const documentStopIds = tasksToStop.map((v: any) => v.documentId);
      await taskModel.setCancelled(tasksToStopIds);
      await documentModel.setCancelled(documentStopIds);
      stopResult.addStoppedTaskIds(...tasksToStopIds);
    } catch (error: any) {
      global.log.save('stop-tasks-error', { error: error && error.message, stopResult });
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
  async stopEvents(
    workflowId: string,
    eventModel: any,
    eventTemplateId: string,
    eventTemplateIdsFilter: string[],
    stopResult: StopResult,
  ): Promise<void> {
    try {
      const eventsInProgress = await eventModel.getEventsInProgress(workflowId);
      const eventsToStop = eventsInProgress.filter(
        (v: any) =>
          v.eventTemplateId !== eventTemplateId && (!Array.isArray(eventTemplateIdsFilter) || eventTemplateIdsFilter.includes(v.eventTemplateId)),
      );
      const eventsToStopIds = eventsToStop.map((v: any) => v.id);
      await eventModel.setCancelled(eventsToStopIds);
      stopResult.addStoppedEventIds(...eventsToStopIds);
    } catch (error: any) {
      global.log.save('stop-events-error', { error: error && error.message, stopResult });
      throw error;
    }
  }
}
