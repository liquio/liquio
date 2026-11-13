export default class ErrorWithDetails extends Error {
  details: any;
  isPublic = true;

  constructor(error: any, details: any) {
    super(error);
    if (typeof error === 'object') {
      this.stack = error.stack;
    }
    this.details = details;
  }
}
