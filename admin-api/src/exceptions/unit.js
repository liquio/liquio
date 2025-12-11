const DEFAULT_MESSAGE = 'Unit.';

class UnitError extends Error {
  constructor(message, details, httpStatusCode = 500) {
    super(message || DEFAULT_MESSAGE);

    this.name = this.constructor.name;
    this.details = details;
    this.httpStatusCode = httpStatusCode;
  }

  /**
   * Error messages.
   */
  static get Messages() {
    return {
      CONFLICTS: 'Can\'t save - conflicts in fields: {{conflicts}}.',
    };
  }
}

module.exports = UnitError;
