import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import { BaseProvider, ProviderMethodArgs } from './base.provider';

interface ProviderOptions {
  baseUrl: string;
  timeout?: number;
  headers?: { [key: string]: string };
}

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
    });

    this.registerMethod('get', this.get.bind(this));
    this.registerMethod('post', this.post.bind(this));
    this.registerMethod('put', this.put.bind(this));
    this.registerMethod('delete', this.delete.bind(this));
    this.registerMethod('patch', this.patch.bind(this));
  }

  async get(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|get', { requestBody });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const params = body.params || {};
    return await this.request('GET', url, undefined, params);
  }

  async post(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|post', { requestBody });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const data = body.data || {};
    const params = body.params || {};
    return await this.request('POST', url, data, params);
  }

  async put(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|put', { requestBody });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const data = body.data || {};
    const params = body.params || {};
    return await this.request('PUT', url, data, params);
  }

  async delete(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|delete', { requestBody });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const params = body.params || {};
    return await this.request('DELETE', url, undefined, params);
  }

  async patch(requestBody: ProviderMethodArgs): Promise<ProviderResponse> {
    this.logger.debug('http-provider|patch', { requestBody });
    const body = this.validateRequestBody(requestBody);
    const url = body.url || '';
    const data = body.data || {};
    const params = body.params || {};
    return await this.request('PATCH', url, data, params);
  }

  private validateRequestBody(requestBody: ProviderMethodArgs): RequestBody {
    // Log the full request body for debugging
    this.logger.debug('http-provider|validate-request-body', { requestBody });

    // If extraParams exists, use it; otherwise use the body directly
    const targetBody = requestBody.extraParams || requestBody;

    if (typeof targetBody !== 'object' || targetBody === null) {
      throw new BadRequestException('Invalid requestBody: must be a non-null object');
    }

    if (!('url' in targetBody) || typeof targetBody.url !== 'string') {
      this.logger.error('http-provider|validate-failed', {
        hasUrl: 'url' in targetBody,
        urlType: typeof (targetBody as Record<string, unknown>).url,
        targetBody,
      });
      throw new BadRequestException('Invalid requestBody: missing or invalid "url"');
    }

    return targetBody as unknown as RequestBody;
  }

  private async request(
    method: string,
    url: string,
    data?: unknown,
    params?: unknown,
  ): Promise<ProviderResponse> {
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
