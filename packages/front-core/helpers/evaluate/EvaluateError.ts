import * as Sentry from '@sentry/browser';

class EvaluateError extends Error {
  func: unknown;
  params: unknown[];

  constructor(message: string, func: unknown, params: unknown[]) {
    super(message);

    this.func = func;
    this.params = params;
  }

  commit = (debugInfo: unknown): void => {
    Sentry.withScope((scope) => {
      scope.setLevel('fatal');
      scope.setTag('Process', String(this.func));
      scope.setTag('Message', this.message);
      // scope.setTag('debugInfo', debugInfo);
      scope.setExtra('debugInfo', debugInfo);
      Sentry.captureException(this);
    });
    console.error('evalation error: ', {
      func: this.func,
      params: this.params,
      message: this.message,
      debugInfo
    });
  };
}

export default EvaluateError;
