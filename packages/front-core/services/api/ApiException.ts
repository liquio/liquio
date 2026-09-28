import * as Sentry from '@sentry/browser';

interface ApiExceptionOptions {
  name?: string;
  message?: string;
  [key: string]: unknown;
}

export default class ApiException extends Error {
  constructor({ name, message, ...extra }: ApiExceptionOptions) {
    super(name || message || 'api exception');

    Sentry.withScope((scope) => {
      // Note: `Scope.setExtra` takes (key: string, extra: unknown); this passes only
      // the `extra` object, so Sentry receives it as the `key` (coerced to a string)
      // with no value — the intended per-field extras are never actually recorded.
      // Preserved as-is; a real fix would call `scope.setExtras(extra)` instead.
      (scope.setExtra as unknown as (extra: unknown) => void)(extra);
      Sentry.captureException(this);
    });
  }
}
