import { getConfig } from 'helpers/configLoader';

/** An `Error` decorated by `checkError` with fields copied from the response and the request. */
export interface ApiError extends Error {
  serverMessage?: unknown;
  status?: unknown;
  [key: string]: unknown;
}

export default async (error: unknown, url: unknown, method: unknown, body: unknown): Promise<void> => {
  const config = getConfig();
  // Log error to console for debugging in development
  console.error('API Exception:', {
    error,
    url,
    method,
    body,
    environment: config.APP_ENV
  });
};

const STATUS_MESSAGES: Record<number, string> = {
  401: '401 Unauthorized',
  403: '403 Forbidden',
  404: '404 Not Found',
  503: '503 Service Unavailable',
  504: '504 Gateway Timeout',
};

type Loose = Record<string, unknown>;

/**
 * `response` is a fetch `Response`, an `Error`, or a plain object carrying `message`.
 * Returns `false` when there is no message to report.
 */
export const checkError = (response: object, request: object = {}): ApiError | false => {
  const res = response as Loose;
  const { status } = res;
  const resMessage = res.message as { message?: unknown } | string | undefined;
  const serverMessage =
    resMessage && typeof resMessage === 'object' && resMessage.message
      ? resMessage.message
      : res.message || res.statusText;
  // Statuses with a fixed message keep the code in it: callers match on it (e.g. '503').
  const message = STATUS_MESSAGES[status as number] || serverMessage;
  let myError: ApiError | false = false;
  if (message) {
    if (response instanceof Error) {
      myError = response as ApiError;
      myError.message = `API: ${message}`;
    } else if (res.message && res.message instanceof Error) {
      myError = res.message as ApiError;
      myError.message = `API: ${message}`;
    } else {
      myError = new Error(`API: ${message}`) as ApiError;
    }
    const target: ApiError = myError;
    target.serverMessage = serverMessage;
    [
      { name: 'response', value: res },
      { name: 'request', value: request as Loose },
    ].forEach((error) => {
      Object.keys(error.value).forEach((key) => {
        if (key !== 'message' && key !== 'headers' && typeof target[key] !== 'object') {
          target[key] = error.value[key];
        }
        // typeof null is 'object', so a null field makes Object.keys throw. Preserved as is.
        if (typeof target[key] === 'object') {
          Object.keys(target[key] as object).forEach((k) => {
            target[`${key}-${k}`] = (target[key] as Loose)[k];
          });
        }
      });
    });
    // A fetch Response keeps `status` on its prototype, so the copy above misses it.
    if (target.status === undefined && status !== undefined) {
      target.status = status;
    }
  }
  return myError;
};
