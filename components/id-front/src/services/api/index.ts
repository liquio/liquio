import store from 'store';
import fetch from 'isomorphic-fetch';

import promiseChain from 'helpers/promiseChain';

import { getConfig } from 'helpers/configLoader';
import ApiException, { checkError } from './ApiException';
import type { ApiError } from './ApiException';

/** Plain action dispatch; there is no thunk middleware. */
export type Dispatch = (action: { type: string; [key: string]: unknown }) => unknown;

export interface ApiRequest {
  url: string;
  method: string;
  headers: Headers;
  credentials: RequestCredentials;
  body?: string | Blob;
}

type Loose = Record<string, unknown>;

interface ResponseData extends Loose {
  meta?: unknown;
  result?: unknown;
}

interface ResponseBody extends Loose {
  data?: ResponseData;
  meta?: unknown;
  error?: unknown;
}

let API_URL: string | null = null;

const getApiUrl = (): string => {
  if (!API_URL) {
    const config = getConfig();
    const BACKEND_URL = config.BACKEND_URL as string;
    API_URL = BACKEND_URL + (BACKEND_URL.charAt(BACKEND_URL.length - 1) !== '/' ? '/' : '');
  }
  return API_URL;
};

export { getApiUrl as API_URL };

let fetchErrorCount = 0;

const parseFetchResponse = async (response: Response): Promise<Loose> => response.json().then((resp) => resp);

const addMeta = (body: ResponseBody) => {
  if (body.data) {
    if (body.data.result) {
      body.data = body.data.result as ResponseData;
    }
    if (!body.data.meta) {
      body.data.meta = body.meta;
    }
    return body.data;
  }
  return body;
};

const getHeaders = (method: string): Headers => {
  // There is no `authorization` key in the root reducer, so `token` is always undefined and
  // the `token` header is sent as the string "undefined". Preserved as is.
  const { token } = (store.getState() as { authorization?: { token?: unknown } }).authorization || {};
  const headers = new Headers();
  headers.append('Access-Control-Request-Method', method);
  headers.append('Access-Control-Request-Headers', method);
  headers.append('Content-Type', 'application/json');
  headers.append('Cookie', document.cookie);
  headers.append('token', String(token));
  return headers;
};

const createRequestBody = (method: string, url: string): ApiRequest => {
  const headers = getHeaders(method);

  return {
    url: getApiUrl() + url,
    method,
    headers,
    credentials: 'include',
  };
};

// Called from `promiseChain`, which passes the value only, so `request` is always undefined
// and `checkError` never receives the request. Preserved as is.
const getResponceBody = async (response: Response, request?: ApiRequest): Promise<unknown> => {
  const { ok } = response;
  let error: ApiError | Response | false = false;
  const contentType = response.headers && response.headers.get('content-type');
  const correctContentType = contentType && typeof contentType === 'string';
  // A response without a Content-Type header makes `.includes` throw a TypeError here.
  // Preserved as is: the error ends up in `responseFail`.
  const isJSON = (contentType as string).includes('application/json');
  if (!ok) {
    if (isJSON) {
      const parsed = await parseFetchResponse(response);
      const errorText = (parsed.error || parsed.detail) as string | undefined;
      if (errorText) {
        const jsonError = new Error(errorText) as ApiError;
        jsonError.type = response.type;
        jsonError.url = response.url;
        jsonError.status = response.status;
        jsonError.statusText = response.statusText;
        jsonError.details = parsed.details;
        jsonError.description = parsed.description || parsed.message;
        error = jsonError;
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

// Same as `getResponceBody`: `request` is always undefined when called from `promiseChain`.
const updateBodyMeta = (body: ResponseBody, request?: ApiRequest): unknown => {
  if (body.error) {
    const error = body.error as Loose;
    Object.keys(body).forEach((key) => {
      error[key] = body[key];
    });
    throw checkError(body.error as object, request);
  }

  return body.meta || (body.data && body.data.meta) ? addMeta(body) : body.data || body;
};

const checkResponse = (action: string, dispatch: Dispatch, request: ApiRequest) => (response: unknown) => {
  const { url, body, method } = request;

  const res = response as { error?: unknown } | null | undefined;
  if (res && res.error) {
    const error = res.error as Loose;
    Object.keys(res).forEach((key) => {
      error[key] = (res as Loose)[key];
    });
    throw checkError(res.error as object, request);
  }

  dispatch({ type: `${action}_SUCCESS`, payload: response, url, method, body });
  return response;
};

const responseFail =
  (action: string, dispatch: Dispatch, request: ApiRequest, createReq: typeof createRequest, payload: unknown) =>
  (error: ApiError): unknown => {
    const { url, body, method } = request;

    dispatch({ type: `${action}_FAIL`, payload: error, url, method, body });
    if (error.message && error.message.includes('Failed to fetch') && fetchErrorCount < 16) {
      fetchErrorCount += 1;
      request.headers = getHeaders(method);
      return createReq(request, action, dispatch, payload);
    }
    fetchErrorCount = 0;
    ApiException(error, url, method, body);
    // This replaces the fixed 'API: 503 ...' message built by `checkError`, so the '503' check
    // below only matches when the server message itself contains it. Preserved as is.
    error.message = (error.serverMessage as string | undefined) || error.message;

    // return Promise.reject(error);
    if (error.message && error.message.includes('ORA') && !error.message.includes('ADD_FILEDOC')) {
      dispatch({ type: 'DB_ERROR', payload: true, url, method, body });
    }
    if (error.message && error.message.includes('503')) {
      dispatch({ type: 'ERROR_503', payload: true, url, method, body });
    }
    return error;
  };

function createRequest(request: ApiRequest, action: string, dispatch: Dispatch, payload: unknown): Promise<unknown> {
  const { url, ...config } = request;
  const { method } = request;
  // PLEASE DONT REMOVE OR RENAME THIS ACTION.
  // THIS ACTION USED BY THE PAST IN reducers/datafetched
  dispatch({ type: action + '_LOADING', payload, body: request.body, url, method });

  return promiseChain<unknown>([
    () => fetch(url, config),
    (response) => getResponceBody(response as Response),
    (body) => updateBodyMeta(body as ResponseBody),
    checkResponse(action, dispatch, request),
  ]).catch(responseFail(action, dispatch, request, createRequest, payload));
}

// A failed request does not reject: `responseFail` returns the error, so callers get the
// `ApiError` as the resolved value. That is why the result is `unknown` and callers cast.
export function get(url: string, action: string, dispatch: Dispatch): Promise<unknown> {
  const request = createRequestBody('get', url);
  return createRequest(request, action, dispatch, {});
}

export function post(url: string, body: unknown, action: string, dispatch: Dispatch): Promise<unknown> {
  const request = createRequestBody('post', url);
  request.body = JSON.stringify(body);

  return createRequest(request, action, dispatch, body);
}

export function upload(
  url: string,
  file: Blob,
  params: Record<string, unknown>,
  action: string,
  dispatch: Dispatch,
): Promise<unknown> {
  const request = createRequestBody(
    'post',
    url +
      '?' +
      Object.entries(params)
        .map(([key, val]) => `${key}=${String(val)}`)
        .join('&'),
  );
  request.body = file;
  request.headers.set('Content-Type', file.type);

  return createRequest(request, action, dispatch, file);
}

export function put(url: string, body: unknown, action: string, dispatch: Dispatch): Promise<unknown> {
  const request = createRequestBody('put', url);
  request.body = JSON.stringify(body);

  return createRequest(request, action, dispatch, body);
}

export function del(url: string, action: string, dispatch: Dispatch): Promise<unknown> {
  const request = createRequestBody('delete', url);

  return createRequest(request, action, dispatch, {});
}
