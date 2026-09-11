import * as Sentry from '@sentry/browser';

export default class ApiException extends Error {
  constructor({ name, message, ...extra }) {
    super(name || message || 'api exception');

    Sentry.withScope((scope) => {
      scope.setExtra(extra);
      Sentry.captureException(this);
    });
  }
}
