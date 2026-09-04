/**
 * Stop result.
 */
export class StopResult {
  createdAt: Date;
  workflowId: string;
  taskTemplateIdsFilter: string[];
  eventTemplateIdsFilter: string[];
  stoppedTasksIds: string[];
  stoppedEventsIds: string[];
  isHandled: boolean;

  /**
   * Stop result constructor.
   * @param {string} workflowId Workflow ID.
   * @param {string[]} taskTemplateIdsFilter Task template IDs filter.
   * @param {string[]} eventTemplateIdsFilter Event template IDs filter.
   */
  constructor(workflowId: string, taskTemplateIdsFilter: string[], eventTemplateIdsFilter: string[]) {
    // Init params.
    this.createdAt = new Date();
    this.workflowId = workflowId;
    this.taskTemplateIdsFilter = taskTemplateIdsFilter;
    this.eventTemplateIdsFilter = eventTemplateIdsFilter;
    this.stoppedTasksIds = [];
    this.stoppedEventsIds = [];
    this.isHandled = false;
  }

  /**
   * Add stopped task IDs.
   * @param {...string} [taskIds] Stopped task IDs.
   */
  addStoppedTaskIds(...taskIds: string[]): this {
    // Append stopped tasks.
    this.stoppedTasksIds.push(...taskIds);

    // Return current instance.
    return this;
  }

  /**
   * Add stopped event IDs.
   * @param  {...string} [eventIds] Stopped event IDs.
   */
  addStoppedEventIds(...eventIds: string[]): this {
    // Append stopped events.
    this.stoppedEventsIds.push(...eventIds);

    // Return current instance.
    return this;
  }

  /**
   * Set is handled indicator.
   * @param {boolean} [isHandled = true] Is handled indicator.
   */
  setIsHandled(isHandled = true): this {
    // Set is handled param.
    this.isHandled = isHandled;

    // Return current instance.
    return this;
  }
}
