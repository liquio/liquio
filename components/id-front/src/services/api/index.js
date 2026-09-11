import store from 'store';
import fetch from 'isomorphic-fetch';

import promiseChain from 'helpers/promiseChain';

import { getConfig } from 'helpers/configLoader';
import ApiException, { checkError } from './ApiException';

let API_URL = null;

const getApiUrl = () => {
  if (!API_URL) {
    const config = getConfig();
    const { BACKEND_URL } = config;
    API_URL = BACKEND_URL + (BACKEND_URL.charAt(BACKEND_URL.length - 1) !== '/' ? '/' : '');
  }
  return API_URL;
};

export { getApiUrl as API_URL };

let fetchErrorCount = 0;

const parseFetchResponse = async (response) => response.json().then((resp) => resp);

const addMeta = (body) => {
  if (body.data) {
    if (body.data.result) {
      body.data = body.data.result;
    }
    if (!body.data.meta) {
      body.data.meta = body.meta;
    }
    return body.data;
  }
  return body;
};

const getHeaders = (method) => {
  const { token } = store.getState().authorization || {};
  const headers = new Headers();
  headers.append('Access-Control-Request-Method', method);
  headers.append('Access-Control-Request-Headers', method);
  headers.append('Content-Type', 'application/json');
  headers.append('Cookie', document.cookie);
  headers.append('token', token);
  return headers;
};

const createRequestBody = (method, url) => {
  const headers = getHeaders(method);

  return {
    url: getApiUrl() + url,
    method,
    headers,
    credentials: 'include',
  };
};

const getResponceBody = async (response, request) => {
  const { ok } = response;
  let error = false;
  const contentType = response.headers && response.headers.get('content-type');
  const correctContentType = contentType && typeof contentType === 'string';
  const isJSON = contentType.includes('application/json');
  if (!ok) {
    if (isJSON) {
      const parsed = await parseFetchResponse(response);
      const errorText = parsed.error || parsed.detail;
      if (errorText) {
        error = new Error(errorText);
        error.type = response.type;
        error.url = response.url;
        error.status = response.status;
        error.statusText = response.statusText;
        error.details = parsed.details;
        error.description = parsed.description || parsed.message;
      }
    } else {
      error = response;
    }

    error = checkError(error || response, request);
    if (error) {
      throw error;
    }
  }

  if (isJSON) {
    return response.json();
  }
  if (correctContentType && contentType.includes('text/html')) {
    return response.text();
  }
  return response.blob();
};

const updateBodyMeta = (body, request) => {
  if (body.error) {
    const { error } = body;
    Object.keys(body).forEach((key) => {
      error[key] = body[key];
    });
    throw checkError(body.error, request);
  }

  return body.meta || (body.data && body.data.meta) ? addMeta(body) : body.data || body;
};

const checkResponse = (action, dispatch, request) => (response) => {
  const { url, body, method } = request;

  if (response && response.error) {
    const { error } = response;
    Object.keys(response).forEach((key) => {
      error[key] = response[key];
    });
    throw checkError(response.error, request);
  }

  dispatch({ type: `${action}_SUCCESS`, payload: response, url, method, body });
  return response;
};

const responseFail = (action, dispatch, request, createReq, payload) => (error) => {
  const { url, body, method } = request;

  dispatch({ type: `${action}_FAIL`, payload: error, url, method, body });
  if (error.message && error.message.includes('Failed to fetch') && fetchErrorCount < 16) {
    fetchErrorCount += 1;
    request.headers = getHeaders(method);
    return createReq(request, action, dispatch, payload);
  }
  fetchErrorCount = 0;
  ApiException(error, url, method, body);
  error.message = error.serverMessage || error.message;

  // return Promise.reject(error);
  if (error.message && error.message.includes('ORA') && !error.message.includes('ADD_FILEDOC')) {
    dispatch({ type: 'DB_ERROR', payload: true, url, method, body });
  }
  if (error.message && error.message.includes('503')) {
    dispatch({ type: 'ERROR_503', payload: true, url, method, body });
  }
  return error;
};

function createRequest(request, action, dispatch, payload) {
  const { url, ...config } = request;
  const { method } = request;
  // PLEASE DONT REMOVE OR RENAME THIS ACTION.
  // THIS ACTION USED BY THE PAST IN reducers/datafetched
  dispatch({ type: action + '_LOADING', payload, body: request.body, url, method });

  return promiseChain([() => fetch(url, config), getResponceBody, updateBodyMeta, checkResponse(action, dispatch, request)]).catch(
    responseFail(action, dispatch, request, createRequest, payload),
  );
}

export function get(url, action, dispatch) {
  const request = createRequestBody('get', url);
  return createRequest(request, action, dispatch, {});
}

export function post(url, body, action, dispatch) {
  const request = createRequestBody('post', url);
  request.body = JSON.stringify(body);

  return createRequest(request, action, dispatch, body);
}

export function upload(url, file, params, action, dispatch) {
  const request = createRequestBody(
    'post',
    url +
      '?' +
      Object.entries(params)
        .map(([key, val]) => `${key}=${val}`)
        .join('&'),
  );
  request.body = file;
  request.headers.set('Content-Type', file.type);

  return createRequest(request, action, dispatch, file);
}

export function put(url, body, action, dispatch) {
  const request = createRequestBody('put', url);
  request.body = JSON.stringify(body);

  return createRequest(request, action, dispatch, body);
}

export function del(url, action, dispatch) {
  const request = createRequestBody('delete', url);

  return createRequest(request, action, dispatch, {});
}
