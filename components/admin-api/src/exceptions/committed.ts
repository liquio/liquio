const DEFAULT_MESSAGE = 'Already committed.';

export class CommitedError extends Error {
  httpStatusCode: number;

  constructor(message?: string) {
    super(message || DEFAULT_MESSAGE);

    this.name = this.constructor.name;
    this.httpStatusCode = 400;
  }

  /**
   * Error messages.
   */
  static get Messages() {
    return {
      WORKFLOW: 'Workflow already exists.',
      UNIT: 'Unit already exists.',
      NUMBER_TEMPLATE: 'Number template already exists.',
      REGISTER: 'Register already exists.',
    };
  }
}
