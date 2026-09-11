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

export const checkError = (response, request = {}) => {
  const { status } = response;
  let message =
    response.message && typeof response.message === 'object' && response.message.message
      ? response.message.message
      : response.message || response.statusText;
  const serverMessage = message;
  let myError = false;
  switch (status) {
    case 401:
      message = '401 unauthorized';
      break;
    case 403:
    case 404:
      message = 'Openstack - 404 File not found';
      break;
    case 503:
      message = '503 Service Temporarily Unavailable';
      break;
    case 504:
      message = 'Openstack - 504 Gateway Time-out';
      break;
    case 500:
      if (message && typeof message === 'string' && message.includes('Invalid URI')) {
        message = message.includes('_preview') ? 'Openstack - Preview not formed' : 'Openstack - URL not formed';
      }
      break;
    default:
      break;
  }
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
  }
  return myError;
};
