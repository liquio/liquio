import * as Sentry from '@sentry/browser';

class EvaluateError extends Error {
  constructor(message, func, params) {
    super(message);

    this.func = func;
    this.params = params;
  }

  commit = (debugInfo) => {
    Sentry.withScope((scope) => {
      scope.setLevel('fatal');
      scope.setTag('Process', this.func);
      scope.setTag('Message', this.message);
      // scope.setTag('debugInfo', debugInfo);
      scope.setExtra('debugInfo', debugInfo);
      Sentry.captureException(this);
    });
    console.error('evalation error: ', {
      func: this.func,
      params: this.params,
      message: this.message,
      debugInfo,
    });
  };
}

export default EvaluateError;
