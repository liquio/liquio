import { getConfig } from 'helpers/configLoader';

export default async (error, url, method, body) => {
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

const STATUS_MESSAGES = {
  401: '401 Unauthorized',
  403: '403 Forbidden',
  404: '404 Not Found',
  503: '503 Service Unavailable',
  504: '504 Gateway Timeout',
};

export const checkError = (response, request = {}) => {
  const { status } = response;
  const serverMessage =
    response.message && typeof response.message === 'object' && response.message.message
      ? response.message.message
      : response.message || response.statusText;
  // Statuses with a fixed message keep the code in it: callers match on it (e.g. '503').
  const message = STATUS_MESSAGES[status] || serverMessage;
  let myError = false;
  if (message) {
    if (response instanceof Error) {
      myError = response;
      myError.message = `API: ${message}`;
    } else if (response.message && response.message instanceof Error) {
      myError = response.message;
      myError.message = `API: ${message}`;
    } else {
      myError = new Error(`API: ${message}`);
    }
    myError.serverMessage = serverMessage;
    [
      { name: 'response', value: response },
      { name: 'request', value: request },
    ].forEach((error) => {
      Object.keys(error.value).forEach((key) => {
        if (key !== 'message' && key !== 'headers' && typeof myError[key] !== 'object') {
          myError[key] = error.value[key];
        }
        if (typeof myError[key] === 'object') {
          Object.keys(myError[key]).forEach((k) => {
            myError[`${key}-${k}`] = myError[key][k];
          });
        }
      });
    });
    // A fetch Response keeps `status` on its prototype, so the copy above misses it.
    if (myError.status === undefined && status !== undefined) {
      myError.status = status;
    }
  }
  return myError;
};
