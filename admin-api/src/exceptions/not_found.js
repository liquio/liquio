const DEFAULT_MESSAGE = 'Not found.';

class NotFoundError extends Error {
  constructor(message) {
    super(message || DEFAULT_MESSAGE);

    this.name = this.constructor.name;
    this.httpStatusCode = 404;
  }

  /**
   * Error messages.
   */
  static get Messages() {
    return {
      WORKFLOW_TEMPLATE: 'WorkflowTemplate doesn\'t exist.',
      WORKFLOW_ERROR: 'WorkflowError doesn\'t exist.',
      TASK_TEMPLATE: 'TaskTemplate doesn\'t exist.',
      DOCUMENT_TEMPLATE: 'DocumentTemplate doesn\'t exist.',
    };
  }
}

module.exports = NotFoundError;
