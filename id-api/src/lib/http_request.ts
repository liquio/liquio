import axios, { AxiosResponse } from 'axios';

const HTTP_METHOD_GET = 'GET';
const HTTP_METHOD_POST = 'POST';
const HTTP_METHOD_PUT = 'PUT';
const HTTP_METHOD_DELETE = 'DELETE';

export interface HttpRequestOptions {
  url: string;
  method: string;
  headers?: object;
  body?: object | string;
  timeout?: number;
}

export interface SerializableResponse<T> {
  status: number;
  statusText: string;
  headers: any;
  data: T;
  config: {
    url?: string;
    method?: string;
    headers?: any;
    timeout?: number;
  };
  request: {
    method?: string;
    url?: string;
    headers?: any;
    data?: any;
    timeout?: number;
  };
}

/**
 * Create serializable response object to avoid circular references.
 */
function createSerializableResponse<T>(axiosResponse: AxiosResponse<T>): SerializableResponse<T> {
  return {
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers: axiosResponse.headers,
    data: axiosResponse.data,
    config: {
      url: axiosResponse.config.url,
      method: axiosResponse.config.method,
      headers: axiosResponse.config.headers,
      timeout: axiosResponse.config.timeout,
    },
    request: {
      method: axiosResponse.config.method,
      url: axiosResponse.config.url,
      headers: axiosResponse.config.headers,
      data: axiosResponse.config.data,
      timeout: axiosResponse.config.timeout,
    },
  };
}

/**
 * HTTP request.
 */
export class HttpRequest {
  /**
   * Methods.
   */
  static get Methods() {
    return {
      GET: HTTP_METHOD_GET,
      POST: HTTP_METHOD_POST,
      PUT: HTTP_METHOD_PUT,
      DELETE: HTTP_METHOD_DELETE,
    };
  }

  /**
   * Send HTTP request.
   */
  static async send<T>(requestOptions: HttpRequestOptions): Promise<AxiosResponse<T>> {
    return axios<T>(requestOptions);
  }

  /**
   * Send HTTP request and return serializable response (no circular references).
   */
  static async sendSerializable<T>(requestOptions: HttpRequestOptions): Promise<SerializableResponse<T>> {
    const response = await axios<T>(requestOptions);
    return createSerializableResponse(response);
  }

  static async sendAndParse<T>(requestOptions: HttpRequestOptions): Promise<T> {
    return await HttpRequest.send(requestOptions).then((response) => response.data as T);
  }
}
