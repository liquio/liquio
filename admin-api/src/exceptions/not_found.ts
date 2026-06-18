const DEFAULT_MESSAGE = 'Not found.';

export class NotFoundError extends Error {
  httpStatusCode: number;

  constructor(message?: string) {
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
