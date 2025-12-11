import * as Sentry from '@sentry/browser';
import qs from 'qs';

import { getConfig } from 'core/helpers/configLoader';
import generatePassword from 'password-generator';
import { readAsUint8Array } from 'helpers/readFileList';
import storage from 'helpers/storage';
import { logout } from 'actions/auth';
import { showServiceMessage } from 'actions/error';
import objectProxy from './objectProxy';

let API_URL = null;

export function getApiUrl() {
  if (!API_URL) {
    const config = getConfig();
    const { backendUrl = '' } = config;
    API_URL = backendUrl + (backendUrl.charAt(backendUrl.length - 1) !== '/' ? '/' : '');
  }
  return API_URL;
};

const disabledDebugActions = ['REQUEST_USER_INFO', 'SEARCH_USERS'];

const getResponseBody = async (response, options) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    if (options?.rawFile && response.status === 200) {
      const blob = await response.blob();
      return blob;
    }
    const json = await response.json();
    return objectProxy(json, { headers: response.headers });
  }

  if (contentType.includes('text/html')) {
    const text = await response.text();
    return text;
  }

  const blob = await response.blob();
  return blob;
};

const st = storage.getItem('cabState');

class RetryableError extends Error {
  constructor(message) {
    super(message);
  }
}

// Retry function with exponential backoff
async function fetchWithRetry(url, requestData, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, requestData);

      if (!response.ok) {
        console.error('[fetch-error]', url, response.status);

        // Handle special case of proxy connection failure
        if (
          response.status === 400 &&
          response.headers.get('content-length') === '0' &&
          response.headers.get('content-type') === 'application/octet-stream'
        ) {
          throw new RetryableError('Connection closed');
        }
      }

      return response;
    } catch (error) {
      attempt++;

      // If it's the last attempt or not a retryable error, throw the error
      if (attempt > maxRetries || !(error instanceof RetryableError)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      
      // Add jitter to prevent thundering herd (±25% randomness)
      const jitter = delay * 0.25 * (Math.random() - 0.5);
      const finalDelay = delay + jitter;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
}

async function createRequest(
  request,
  action,
  dispatch,
  payload,
  options,
  isIgnore,
) {
  if (!navigator.onLine) {
    dispatch(showServiceMessage(new Error('ConnectionFailed')));
    return;
  }

  const { url, ...conf } = request;
  const { method } = request;
  dispatch({ type: action, payload, body: request.body, url, method });

  const debugUserId = storage.getItem('debug-user-id');

  const requestData = {
    ...conf,
    cache: 'reload',
    headers: {
      ...conf.headers,
      token: storage.getItem('token'),
    },
  };

  if (debugUserId && !disabledDebugActions.includes(action)) {
    requestData.headers['debug-user-id'] = debugUserId;
  }

  try {
    const response = await fetchWithRetry(url, requestData);

    if (!navigator.onLine) {
      dispatch(showServiceMessage(new Error('ConnectionFailed')));
    }

    const responseBody = await getResponseBody(response, options);

    const errors = []
      .concat(responseBody.error, responseBody.errors)
      .filter(Boolean);

    if (response.url === `${getApiUrl()}auth/login` && response.status !== 200) {
      throw new Error('AuthProcessError');
    }

    if (response.status === 401) {
      if (!st) {
        const signa = generatePassword(20, false);
        storage.setItem('cabState', signa);
      }
      dispatch(logout());
      throw new Error('401 unauthorized');
    }

    if (response.status === 403) {
      const error = new Error('403 forbidden');
      error.details = responseBody?.error?.details;
      throw error;
    }

    if (response.status === 413) {
      throw new Error('413 Payload Too Large');
    }

    if (response.status === 404) {
      throw new Error('404 not found');
    }

    if (errors.length) {
      const errorMessage = errors.shift();
      const error = new Error(
        errorMessage?.error?.message ||
          errorMessage?.message ||
          errorMessage?.msg ||
          errorMessage,
      );
      error.details = errorMessage.details;
      error.response = responseBody;
      throw error;
    }

    const responseData =
      'data' in responseBody
        ? objectProxy(responseBody.data, { headers: response.headers })
        : responseBody;

    if (responseBody.meta || responseBody.pagination) {
      responseData.meta = responseBody.pagination || responseBody.meta;
    }

    dispatch({
      type: `${action}_SUCCESS`,
      payload: responseData,
      request: payload,
      url,
      method,
      body: request.body,
    });
    return responseData;
  } catch (error) {
    if (error.message === 'Failed to fetch' && navigator.onLine && !isIgnore) {
      dispatch(showServiceMessage(error));
    }

    if (error.message === 'User without needed role.' && navigator.onLine) {
      dispatch(showServiceMessage(error));
    }

    if (
      error.message === 'Declined by user access rules.' &&
      navigator.onLine
    ) {
      dispatch(showServiceMessage(error));
    }

    dispatch({
      type: `${action}_FAIL`,
      payload: error,
      url,
      method,
      body: request.body,
      request: payload,
    });

    if (
      error.message !== '401 unauthorized' &&
      error.message !== '404 not found' &&
      error.message !== 'NetworkError when attempting to fetch resource.' &&
      error.message === 'Failed to fetch'
    ) {
      Sentry.withScope((scope) => {
        Object.keys(error).forEach((key) => scope.setExtra(key, error[key]));
        scope.setTag('service', 'api');
        scope.setTag('Message', error.message);
        scope.setExtra('url', url);
        scope.setExtra('method', method);
        scope.setExtra('body', request.body);
        scope.setExtra('response', error.response);
        Sentry.captureException(error);
      });
    }
    throw error;
  }
}

export function get(url, action, dispatch, payload, options = {}) {
  const { headers } = options;
  const request = {
    url: getApiUrl() + url,
    method: 'get',
    headers: {
      ...(headers || {}),
    },
  };

  return createRequest(request, action, dispatch, payload, options);
}

export function post(
  url,
  body,
  action,
  dispatch,
  additional = {},
  options = {},
  isIgnore,
) {
  const { headers, signal } = options;
  const request = {
    url: getApiUrl() + url,
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    signal,
    body: JSON.stringify(body),
  };

  return createRequest(
    request,
    action,
    dispatch,
    { ...body, ...additional },
    {},
    isIgnore,
  );
}

export async function upload(url, file, params, action, dispatch) {
  const queryString = qs.stringify(params, {
    arrayFormat: 'index',
    encode: false,
  });

  const binary = await readAsUint8Array(file);

  const request = {
    url: getApiUrl() + url + (queryString ? '?' + queryString : ''),
    method: 'post',
    headers: { 'Content-Type': file.type },
    body: binary,
  };

  return createRequest(request, action, dispatch, binary);
}

export function put(
  url,
  body,
  action,
  dispatch,
  additional = {},
  options = {},
) {
  const { headers } = options;

  const request = {
    url: getApiUrl() + url,
    method: 'put',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  };

  return createRequest(request, action, dispatch, { ...body, ...additional });
}

export function del(url, body, action, dispatch, payload) {
  const request = {
    url: getApiUrl() + url,
    method: 'delete',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };

  return createRequest(request, action, dispatch, payload);
}
