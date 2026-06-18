const DEFAULT_MESSAGE = 'Workflow.';

export class WorkflowError extends Error {
  httpStatusCode: number;
  details?: any;

  constructor(message?: string, details?: any) {
    super(message || DEFAULT_MESSAGE);

    this.name = this.constructor.name;
    this.details = details;
    this.httpStatusCode = 500;
  }

  /**
   * Error messages.
   */
  static get Messages() {
    return {
      INVALID_XML: 'Invalid XML BPMN schema.',
      IMPORT: 'Problem with import workflow.',
      CONSTRAINT: 'Some process has been started already based on this workflow template.',
      TAG_EXISTS: 'Tag already exists.',
      TAG_NOT_FOUND: 'Tag not found.',
    };
  }
}
