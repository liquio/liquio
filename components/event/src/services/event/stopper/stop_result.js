/**
 * Stop result.
 */
class StopResult {
  /**
   * Stop result constructor.
   * @param {string} workflowId Workflow ID.
   * @param {string[]} taskTemplateIdsFilter Task template IDs filter.
   * @param {string[]} eventTemplateIdsFilter Event template IDs filter.
   */
  constructor(workflowId, taskTemplateIdsFilter, eventTemplateIdsFilter) {
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
  addStoppedTaskIds(...taskIds) {
    // Append stopped tasks.
    this.stoppedTasksIds.push(...taskIds);

    // Return current instance.
    return this;
  }

  /**
   * Add stopped event IDs.
   * @param  {...string} [eventIds] Stopped event IDs.
   */
  addStoppedEventIds(...eventIds) {
    // Append stopped events.
    this.stoppedEventsIds.push(...eventIds);

    // Return current instance.
    return this;
  }

  /**
   * Set is handled indicator.
   * @param {boolean} [isHandled = true] Is handled indicator.
   */
  setIsHandled(isHandled = true) {
    // Set is handled param.
    this.isHandled = isHandled;

    // Return current instance.
    return this;
  }
}

module.exports = StopResult;
