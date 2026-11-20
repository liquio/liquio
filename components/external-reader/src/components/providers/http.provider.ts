import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import { BaseProvider, ProviderMethodArgs } from './base.provider';

interface ProviderOptions {
  baseUrl: string;
  timeout?: number;
  headers?: { [key: string]: string };
  /** Cap for the upstream response body in bytes. Default 10 MiB. */
  maxContentLength?: number;
  /**
   * Optional allowlist of request paths. An entry ending with "/" matches that prefix, any other entry matches the path exactly
   * (query string ignored). When set, a request "url" outside the list is rejected.
   */
  allowedPaths?: string[];
}

const DEFAULT_MAX_CONTENT_LENGTH = 10 * 1024 * 1024;
// URL scheme ("http:", "file:", "javascript:" ...).
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const CONTROL_CHARS_PATTERN = /[\u0000-\u001f\u007f]/;

interface RequestBody {
  url: string;
  params?: unknown;
  data?: unknown;
}

interface ProviderResponse {
  status: number;
  statusText?: string;
  data: unknown;
}

/**
 * HttpProvider is a basic provider that sends HTTP requests to a specified base URL.
 */
@Injectable()
export class HttpProvider extends BaseProvider<ProviderOptions> {
  private readonly client: AxiosInstance;

  constructor(...args: ConstructorParameters<typeof BaseProvider<ProviderOptions>>) {
    super(...args);

    this.client = axios.create({
      baseURL: this.options?.baseUrl || 'http://localhost',
      timeout: this.options?.timeout || 5000,
      headers: this.options?.headers || { 'Content-Type': 'application/json' },
      // The request "url" comes from the end user: it must never replace the configured host, and the configured
      // headers (credentials) must never follow a redirect to another host.
      allowAbsoluteUrls: false,
      maxRedirects: 0,
      maxContentLength: this.options?.maxContentLength || DEFAULT_MAX_CONTENT_LENGTH,
    });

    this.registerMethod('get', this.get.bind(this));
    this.registerMethod('post', this.post.bind(this));
    this.registerMethod('put', this.put.bind(this));
    this.registerMethod('delete', this.delete.bind(this));
    this.registerMethod('patch', this.patch.bind(this));
  }

  async get(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|get', { keys: this.bodyKeys(requestBody) });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const params = body.params || {};
    return await this.request('GET', url, undefined, params);
  }

  async post(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|post', { keys: this.bodyKeys(requestBody) });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const data = body.data || {};
    const params = body.params || {};
    return await this.request('POST', url, data, params);
  }

  async put(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|put', { keys: this.bodyKeys(requestBody) });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const data = body.data || {};
    const params = body.params || {};
    return await this.request('PUT', url, data, params);
  }

  async delete(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|delete', { keys: this.bodyKeys(requestBody) });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const params = body.params || {};
    return await this.request('DELETE', url, undefined, params);
  }

  async patch(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|patch', { keys: this.bodyKeys(requestBody) });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const data = body.data || {};
    const params = body.params || {};
    return await this.request('PATCH', url, data, params);
  }

  // Only keys are logged: request bodies carry personal data (ipn, edrpou, filters).
  private bodyKeys(body: unknown): string[] {
    return body && typeof body === 'object' ? Object.keys(body) : [];
  }

  private validateRequestBody(requestBody: ProviderMethodArgs): RequestBody {
    // If extraParams exists, use it; otherwise use the body directly
    const targetBody = requestBody.extraParams || requestBody;

    if (typeof targetBody !== 'object' || targetBody === null) {
      throw new BadRequestException('Invalid requestBody: must be a non-null object');
    }

    if (!('url' in targetBody) || typeof targetBody.url !== 'string') {
      this.logger.error('http-provider|validate-failed', {
        hasUrl: 'url' in targetBody,
        urlType: typeof (targetBody as Record<string, unknown>).url,
        keys: this.bodyKeys(targetBody),
      });
      throw new BadRequestException('Invalid requestBody: missing or invalid "url"');
    }

    this.assertAllowedUrl(targetBody.url);

    return targetBody as unknown as RequestBody;
  }

  /**
   * Allows only a path relative to the configured baseUrl, so the caller cannot steer the request to another host.
   * @param {string} url - Request url from the caller.
   */
  private assertAllowedUrl(url: string): void {
    const fail = () => {
      this.logger.warn('http-provider|url-rejected', { urlLength: url.length });
      throw new BadRequestException('Invalid requestBody: "url" must be a relative path');
    };

    let decoded: string;
    try {
      decoded = decodeURIComponent(url);
    } catch {
      return fail();
    }

    for (const value of [url, decoded]) {
      const path = value.split(/[?#]/)[0];
      if (
        SCHEME_PATTERN.test(value) ||
        value.startsWith('//') ||
        value.includes('\\') ||
        value.includes('@') ||
        CONTROL_CHARS_PATTERN.test(value) ||
        path.split('/').includes('..')
      ) {
        return fail();
      }
    }

    const allowedPaths = this.options?.allowedPaths;
    if (allowedPaths?.length) {
      const path = '/' + url.split(/[?#]/)[0].replace(/^\/+/, '');
      const isAllowed = allowedPaths.some((entry) => (entry.endsWith('/') ? path.startsWith(entry) : path === entry));
      if (!isAllowed) {
        return fail();
      }
    }
  }

  private async request(method: string, url: string, data?: unknown, params?: unknown): Promise<ProviderResponse> {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        params,
        validateStatus: () => true, // Prevents Axios from throwing on non-200 statuses
      });
      return { status: response.status, data: response.data };
    } catch (error) {
      this.logger.error('http-provider|request-failed', {
        method,
        url,
        error: error.message,
      });
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }
}
