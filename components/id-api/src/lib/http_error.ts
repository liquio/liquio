export class HttpError extends Error {
  public status: number;
  public details?: Record<string, any>;

  constructor(status: number, message: string) {
    super(message);

    this.status = status;
    this.name = this.constructor.name;
  }

  /**
   * Convert object to string.
   */
  toString(): string {
    return `${this.message}`;
  }
}
