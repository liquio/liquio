const DEFAULT_MESSAGE = 'User doesn\'t have any access.';

class AccessError extends Error {
  constructor(message) {
    super(message || DEFAULT_MESSAGE);

    this.name = this.constructor.name;
    this.httpStatusCode = 403;
  }

  /**
   * Error messages.
   */
  static get Messages() {
    return {
      WORKFLOW_EDITOR: 'Workflow edit function has been disabled.',
      UNIT: 'Access denied.',
    };
  }
}

module.exports = AccessError;
