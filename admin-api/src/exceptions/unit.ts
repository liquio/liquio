const DEFAULT_MESSAGE = 'Unit.';

export class UnitError extends Error {
  httpStatusCode: number;
  details: any;

  constructor(message?: string, details?: any, httpStatusCode: number = 500) {
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
