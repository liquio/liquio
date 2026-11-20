import { Readable } from 'node:stream';

import { RegisterApiError, RegisterApiErrorMessage } from './errors';
import {
  RegisterApiAccessLogEntry,
  RegisterApiCallOptions,
  RegisterApiConfig,
  RegisterApiDeleteBulkRecordsOptions,
  RegisterApiDeleteRecordOptions,
  RegisterApiExportOptions,
  RegisterApiHistoryEntry,
  RegisterApiHttpResult,
  RegisterApiImportBulkRecordsOptions,
  RegisterApiImportOptions,
  RegisterApiKey,
  RegisterApiListResponse,
  RegisterApiLog,
  RegisterApiPingOptions,
  RegisterApiPingResult,
  RegisterApiQuery,
  RegisterApiRecord,
  RegisterApiRegister,
  RegisterApiRollbackRecordOptions,
  RegisterApiRoutes,
  RegisterApiSearchOptions,
  RegisterApiStartRollbackOptions,
  RegisterApiStreamExportOptions,
  RegisterApiStreamResult,
} from './types';
import { getTraceId } from '../common/async_local_storage';

// Constants.
const DEFAULT_SERVER = 'http://register';
const DEFAULT_PORT = 8080;
const DEFAULT_TIMEOUT = 30000;
const BULK_TIMEOUT_FACTOR = 2;
const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_OCTET_STREAM = 'application/octet-stream';
const BRACKET_QUERY_KEYS = ['data', 'data_like', 'sort', 'data_date_from', 'data_date_to'];

/** Default register routes. */
export const REGISTER_API_DEFAULT_ROUTES: RegisterApiRoutes = {
  getRegisters: '/registers',
  findRegisterById: '/registers/:id',
  createRegister: '/registers',
  updateRegisterById: '/registers/:id',
  deleteRegisterById: '/registers/:id',
  exportRegister: '/registers/:id/export',
  importRegister: '/registers/import',
  streamExportRegister: '/registers/:id/stream-export',
  streamImportRegister: '/registers/stream-import',
  getKeys: '/keys',
  findKeyById: '/keys/:id',
  getSyncedKeys: '/keys/synced',
  getAllSyncedKeys: '/keys/allSynced',
  createKey: '/keys',
  updateKeyById: '/keys/:id',
  deleteKeyById: '/keys/:id',
  updateKeyIndexMapping: '/keys/:id/mapping',
  reindexKey: '/keys/:id/reindex',
  afterHandlersReindexKey: '/keys/:id/afterhandlers-reindex',
  getKeyHistory: '/keys/:id/history',
  getRecords: '/records',
  getRecordsByPost: '/records-by-post',
  getFilteredRecords: '/records/filter',
  searchRecords: '/records/search',
  findRecordById: '/records/:id',
  createRecord: '/records',
  updateRecordById: '/records/:id',
  deleteRecordById: '/records/:id',
  importBulkRecords: '/records/bulk',
  deleteBulkRecords: '/records/bulk',
  getRecordHistory: '/records/:id/history',
  getAccessLog: '/access-log',
  startRollback: '/rollback/start',
  getRollbackStatus: '/rollback/:id/status',
  rollbackRecord: '/rollback/record',
  ping: '/test/ping',
  pingWithAuth: '/test/ping_with_auth',
};

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  routeKey: keyof RegisterApiRoutes;
  id?: string | number;
  query?: RegisterApiQuery;
  json?: unknown;
  streamBody?: Readable;
  call?: RegisterApiCallOptions;
  defaultTimeout?: number;
}

/**
 * Typed HTTP client for the register service.
 *
 * Instance-based; use `getRegisterApiClient` for a process-wide instance.
 *
 * Errors: non-2xx responses, network failures and timeouts reject with `RegisterApiError`.
 * `sendPingRequest` never throws.
 */
export class RegisterApiClient {
  readonly config: RegisterApiConfig;
  readonly baseUrl: string;
  readonly routes: RegisterApiRoutes;
  readonly timeout: number;

  /**
   * @param {RegisterApiConfig} [config] Register API client config.
   */
  constructor(config: RegisterApiConfig = {}) {
    this.config = config;
    if (config.url) {
      this.baseUrl = config.url.replace(/\/+$/, '');
    } else {
      const server = config.server || DEFAULT_SERVER;
      const port = config.port || (config.server ? undefined : DEFAULT_PORT);
      this.baseUrl = `${server}${port ? `:${port}` : ''}`;
    }
    this.routes = { ...REGISTER_API_DEFAULT_ROUTES, ...config.routes };
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  // Registers.

  /**
   * Get registers.
   * @param {RegisterApiQuery} [query] Query.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiRegister>>} Response body.
   * @throws {RegisterApiError}
   */
  async getRegisters(query?: RegisterApiQuery, options?: RegisterApiCallOptions): Promise<RegisterApiListResponse<RegisterApiRegister>> {
    return (await this.json({ method: 'GET', routeKey: 'getRegisters', query, call: options })).body;
  }

  /**
   * Find a register by ID.
   * @param {number|string} id Register ID.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiRegister|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async findRegisterById(id: number | string, options?: RegisterApiCallOptions): Promise<RegisterApiRegister | undefined> {
    return this.data({ method: 'GET', routeKey: 'findRegisterById', id, call: options });
  }

  /**
   * Create a register.
   * @param {object} data Register data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiRegister|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async createRegister(data: unknown, options?: RegisterApiCallOptions): Promise<RegisterApiRegister | undefined> {
    return this.data({ method: 'POST', routeKey: 'createRegister', json: data, call: options });
  }

  /**
   * Update a register.
   * @param {number|string} id Register ID.
   * @param {object} data Register data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiRegister|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async updateRegisterById(id: number | string, data: unknown, options?: RegisterApiCallOptions): Promise<RegisterApiRegister | undefined> {
    return this.data({ method: 'PUT', routeKey: 'updateRegisterById', id, json: data, call: options });
  }

  /**
   * Delete a register.
   * @param {number|string} id Register ID.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async deleteRegisterById(id: number | string, options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'DELETE', routeKey: 'deleteRegisterById', id, call: options });
  }

  /**
   * Export a register.
   * @param {number|string} id Register ID.
   * @param {RegisterApiExportOptions} [params] Export params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response body.
   * @throws {RegisterApiError}
   */
  async exportRegister(id: number | string, params: RegisterApiExportOptions = {}, options?: RegisterApiCallOptions): Promise<any> {
    const query = { with_data: params.withData, key_ids: params.keyIds };
    return (await this.json({ method: 'GET', routeKey: 'exportRegister', id, query, call: options })).body;
  }

  /**
   * Export a register as a file stream.
   * @param {number|string} id Register ID.
   * @param {RegisterApiExportOptions} [params] Export params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiStreamResult>}
   * @throws {RegisterApiError}
   */
  async exportRegisterFile(
    id: number | string,
    params: RegisterApiExportOptions = {},
    options?: RegisterApiCallOptions,
  ): Promise<RegisterApiStreamResult> {
    const query = { with_data: params.withData, file: true, key_ids: params.keyIds };
    return this.stream({ method: 'GET', routeKey: 'exportRegister', id, query, call: options });
  }

  /**
   * Import a register.
   * @param {RegisterApiImportOptions} params Import params.
   * @param {object} data Register export data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async importRegister(params: RegisterApiImportOptions, data: unknown, options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'POST', routeKey: 'importRegister', query: this.importQuery(params), json: data, call: options });
  }

  /**
   * Import a register from a file stream.
   * @param {RegisterApiImportOptions} params Import params.
   * @param {Readable} body File stream.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiStreamResult>}
   * @throws {RegisterApiError}
   */
  async importRegisterFile(params: RegisterApiImportOptions, body: Readable, options?: RegisterApiCallOptions): Promise<RegisterApiStreamResult> {
    const query = { ...this.importQuery(params), file: true };
    return this.stream({ method: 'POST', routeKey: 'importRegister', query, streamBody: body, call: options });
  }

  /**
   * Stream-export a register.
   * @param {number|string} id Register ID.
   * @param {RegisterApiStreamExportOptions} [params] Export params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiStreamResult>}
   * @throws {RegisterApiError}
   */
  async streamExportRegister(
    id: number | string,
    params: RegisterApiStreamExportOptions = {},
    options?: RegisterApiCallOptions,
  ): Promise<RegisterApiStreamResult> {
    const query = { with_data: params.withData, file: params.file };
    return this.stream({ method: 'GET', routeKey: 'streamExportRegister', id, query, call: options });
  }

  /**
   * Stream-import a register.
   * @param {object} params Import params.
   * @param {boolean} [params.clearRecords] Clear records first.
   * @param {Readable} body Data stream.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiStreamResult>}
   * @throws {RegisterApiError}
   */
  async streamImportRegister(params: { clearRecords?: boolean }, body: Readable, options?: RegisterApiCallOptions): Promise<RegisterApiStreamResult> {
    const query = { clear_records: params?.clearRecords };
    return this.stream({ method: 'POST', routeKey: 'streamImportRegister', query, streamBody: body, call: options });
  }

  // Keys.

  /**
   * Get keys.
   * @param {RegisterApiQuery} [query] Query.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiKey>>} Response body.
   * @throws {RegisterApiError}
   */
  async getKeys(query?: RegisterApiQuery, options?: RegisterApiCallOptions): Promise<RegisterApiListResponse<RegisterApiKey>> {
    return (await this.json({ method: 'GET', routeKey: 'getKeys', query, call: options })).body;
  }

  /**
   * Find a key by ID.
   * @param {number|string} id Key ID.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiKey|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async findKeyById(id: number | string, options?: RegisterApiCallOptions): Promise<RegisterApiKey | undefined> {
    return this.data({ method: 'GET', routeKey: 'findKeyById', id, call: options });
  }

  /**
   * Get synced keys.
   * @param {Array<number|string>|string} ids Key IDs.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async getSyncedKeys(ids: Array<number | string> | string, options?: RegisterApiCallOptions): Promise<any> {
    const query = { ids: Array.isArray(ids) ? ids.join(',') : ids };
    return this.data({ method: 'GET', routeKey: 'getSyncedKeys', query, call: options });
  }

  /**
   * Get all synced keys.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async getAllSyncedKeys(options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'GET', routeKey: 'getAllSyncedKeys', call: options });
  }

  /**
   * Create a key.
   * @param {object} data Key data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiKey|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async createKey(data: unknown, options?: RegisterApiCallOptions): Promise<RegisterApiKey | undefined> {
    return this.data({ method: 'POST', routeKey: 'createKey', json: data, call: options });
  }

  /**
   * Update a key.
   * @param {number|string} id Key ID.
   * @param {object} data Key data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiKey|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async updateKeyById(id: number | string, data: unknown, options?: RegisterApiCallOptions): Promise<RegisterApiKey | undefined> {
    return this.data({ method: 'PUT', routeKey: 'updateKeyById', id, json: data, call: options });
  }

  /**
   * Delete a key.
   * @param {number|string} id Key ID.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async deleteKeyById(id: number | string, options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'DELETE', routeKey: 'deleteKeyById', id, call: options });
  }

  /**
   * Update the index mapping of a key.
   * @param {number|string} keyId Key ID.
   * @param {object} mapping Index mapping.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async updateKeyIndexMapping(keyId: number | string, mapping: unknown, options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'PUT', routeKey: 'updateKeyIndexMapping', id: keyId, json: { mapping }, call: options });
  }

  /**
   * Reindex a key.
   * @param {number|string} keyId Key ID.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async reindexKey(keyId: number | string, options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'POST', routeKey: 'reindexKey', id: keyId, call: options });
  }

  /**
   * Run after handlers reindex of a key.
   * @param {number|string} keyId Key ID.
   * @param {object} data Request data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async afterHandlersReindexKey(keyId: number | string, data: unknown, options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'POST', routeKey: 'afterHandlersReindexKey', id: keyId, json: data, call: options });
  }

  /**
   * Get key history.
   * @param {number|string} keyId Key ID.
   * @param {RegisterApiQuery} [query] Query.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiHistoryEntry>>} Response body.
   * @throws {RegisterApiError}
   */
  async getKeyHistory(
    keyId: number | string,
    query?: RegisterApiQuery,
    options?: RegisterApiCallOptions,
  ): Promise<RegisterApiListResponse<RegisterApiHistoryEntry>> {
    return (await this.json({ method: 'GET', routeKey: 'getKeyHistory', id: keyId, query, call: options })).body;
  }

  // Records.

  /**
   * Get records.
   * @param {RegisterApiQuery} [query] Query.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiRecord>>} Response body.
   * @throws {RegisterApiError}
   */
  async getRecords(query?: RegisterApiQuery, options?: RegisterApiCallOptions): Promise<RegisterApiListResponse<RegisterApiRecord>> {
    return (await this.json({ method: 'GET', routeKey: 'getRecords', query, call: options })).body;
  }

  /**
   * Get records with the filter in the request body.
   * @param {object} body Request body.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiRecord>>} Response body.
   * @throws {RegisterApiError}
   */
  async getRecordsByPost(body: unknown, options?: RegisterApiCallOptions): Promise<RegisterApiListResponse<RegisterApiRecord>> {
    return (await this.json({ method: 'POST', routeKey: 'getRecordsByPost', json: body, call: options })).body;
  }

  /**
   * Get filtered records.
   * @param {RegisterApiQuery} [query] Query.
   * @param {object} [body] Request body.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiRecord>>} Response body.
   * @throws {RegisterApiError}
   */
  async getFilteredRecords(
    query?: RegisterApiQuery,
    body: unknown = {},
    options?: RegisterApiCallOptions,
  ): Promise<RegisterApiListResponse<RegisterApiRecord>> {
    return (await this.json({ method: 'POST', routeKey: 'getFilteredRecords', query, json: body, call: options })).body;
  }

  /**
   * Export filtered records as a CSV stream.
   * @param {RegisterApiQuery} query Query (`csv_map`, `no_limit`, ...).
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiStreamResult>}
   * @throws {RegisterApiError}
   */
  async exportFilteredRecordsCsv(query: RegisterApiQuery, options?: RegisterApiCallOptions): Promise<RegisterApiStreamResult> {
    return this.stream({ method: 'POST', routeKey: 'getFilteredRecords', query, call: options });
  }

  /**
   * Search records.
   * @param {RegisterApiSearchOptions} params Search params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async searchRecords(params: RegisterApiSearchOptions, options?: RegisterApiCallOptions): Promise<any> {
    const query: RegisterApiQuery = { key_id: params.keyId, text: params.text };
    if (Number.isInteger(params.limit)) {
      query.limit = params.limit;
    }
    if (Number.isInteger(params.offset)) {
      query.offset = params.offset;
    }
    return this.data({ method: 'GET', routeKey: 'searchRecords', query, call: options });
  }

  /**
   * Find a record by ID.
   * @param {string} id Record ID.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiRecord|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async findRecordById(id: string, options?: RegisterApiCallOptions): Promise<RegisterApiRecord | undefined> {
    return this.data({ method: 'GET', routeKey: 'findRecordById', id, call: options });
  }

  /**
   * Create a record.
   * @param {object} data Record data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiRecord|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async createRecord(data: unknown, options?: RegisterApiCallOptions): Promise<RegisterApiRecord | undefined> {
    return this.data({ method: 'POST', routeKey: 'createRecord', json: data, call: options });
  }

  /**
   * Update a record.
   * @param {string} id Record ID.
   * @param {object} data Record data.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiRecord|undefined>} Response data.
   * @throws {RegisterApiError}
   */
  async updateRecordById(id: string, data: unknown, options?: RegisterApiCallOptions): Promise<RegisterApiRecord | undefined> {
    return this.data({ method: 'PUT', routeKey: 'updateRecordById', id, json: data, call: options });
  }

  /**
   * Delete a record.
   * @param {string} id Record ID.
   * @param {RegisterApiDeleteRecordOptions} [options] Call options with the person and the body.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async deleteRecordById(id: string, options: RegisterApiDeleteRecordOptions = {}): Promise<any> {
    const query: RegisterApiQuery = {};
    if (options.person?.id && options.person?.name) {
      query.personId = options.person.id;
      query.personName = options.person.name;
    }
    return this.data({ method: 'DELETE', routeKey: 'deleteRecordById', id, query, json: options.body, call: options });
  }

  /**
   * Import records in bulk. The default timeout is twice the client timeout.
   * @param {RegisterApiImportBulkRecordsOptions} params Import params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async importBulkRecords(params: RegisterApiImportBulkRecordsOptions, options?: RegisterApiCallOptions): Promise<any> {
    const { registerId, keyId, background, records, isCalculateSearchStrings, isReturnCreatedRecords } = params;
    return this.data({
      method: 'POST',
      routeKey: 'importBulkRecords',
      json: { registerId, keyId, background, records, isCalculateSearchStrings, isReturnCreatedRecords },
      call: options,
      defaultTimeout: this.timeout * BULK_TIMEOUT_FACTOR,
    });
  }

  /**
   * Delete records in bulk.
   * @param {RegisterApiDeleteBulkRecordsOptions} params Delete params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async deleteBulkRecords(params: RegisterApiDeleteBulkRecordsOptions, options?: RegisterApiCallOptions): Promise<any> {
    const { registerId, keyId, skipRecordIds } = params;
    return this.data({ method: 'DELETE', routeKey: 'deleteBulkRecords', json: { registerId, keyId, skipRecordIds }, call: options });
  }

  /**
   * Get record history.
   * @param {string} recordId Record ID.
   * @param {RegisterApiQuery} [query] Query.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiHistoryEntry>>} Response body.
   * @throws {RegisterApiError}
   */
  async getRecordHistory(
    recordId: string,
    query?: RegisterApiQuery,
    options?: RegisterApiCallOptions,
  ): Promise<RegisterApiListResponse<RegisterApiHistoryEntry>> {
    return (await this.json({ method: 'GET', routeKey: 'getRecordHistory', id: recordId, query, call: options })).body;
  }

  /**
   * Get the access log.
   * @param {RegisterApiQuery} query Query (`key_id` or `record_id`, `offset`, `limit`, `created_from`, `created_to`).
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<RegisterApiListResponse<RegisterApiAccessLogEntry>>} Response body.
   * @throws {RegisterApiError}
   */
  async getAccessLog(query: RegisterApiQuery, options?: RegisterApiCallOptions): Promise<RegisterApiListResponse<RegisterApiAccessLogEntry>> {
    return (await this.json({ method: 'GET', routeKey: 'getAccessLog', query, call: options })).body;
  }

  // Rollback.

  /**
   * Start a rollback.
   * @param {RegisterApiStartRollbackOptions} params Rollback params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async startRollback(params: RegisterApiStartRollbackOptions, options?: RegisterApiCallOptions): Promise<any> {
    const { keyId, timePoint } = params;
    return this.data({ method: 'POST', routeKey: 'startRollback', json: { keyId, timePoint }, call: options });
  }

  /**
   * Get the rollback status.
   * @param {number|string} rollbackId Rollback ID.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async getRollbackStatus(rollbackId: number | string, options?: RegisterApiCallOptions): Promise<any> {
    return this.data({ method: 'GET', routeKey: 'getRollbackStatus', id: rollbackId, call: options });
  }

  /**
   * Roll back a record.
   * @param {RegisterApiRollbackRecordOptions} params Rollback params.
   * @param {RegisterApiCallOptions} [options] Call options.
   * @returns {Promise<any>} Response data.
   * @throws {RegisterApiError}
   */
  async rollbackRecord(params: RegisterApiRollbackRecordOptions, options?: RegisterApiCallOptions): Promise<any> {
    const { historyId, recordId, keyId } = params;
    return this.data({ method: 'POST', routeKey: 'rollbackRecord', json: { historyId, recordId, keyId }, call: options });
  }

  // Ping.

  /**
   * Ping the register. Never throws.
   * @param {RegisterApiPingOptions} [options] Ping options.
   * @returns {Promise<RegisterApiPingResult|undefined>} Ping result, or `undefined` on any failure.
   */
  async sendPingRequest({ withAuth = true }: RegisterApiPingOptions = {}): Promise<RegisterApiPingResult | undefined> {
    try {
      const result = await this.json({ method: 'GET', routeKey: withAuth ? 'pingWithAuth' : 'ping' });
      return {
        version: result.headers.version,
        customer: result.headers.customer,
        environment: result.headers.environment,
        body: result.body,
      };
    } catch (error: any) {
      this.log('register-api-ping-error', { message: error?.message });
      return undefined;
    }
  }

  // Internals.

  private getLog(): RegisterApiLog | undefined {
    if (this.config.getLog) {
      return this.config.getLog();
    }

    const globalLog = (global as any).log;
    return globalLog && typeof globalLog.save === 'function' ? globalLog : undefined;
  }

  private log(event: string, data?: any, level?: 'info' | 'warn' | 'warning' | 'error'): void {
    try {
      this.getLog()?.save(event, data, level);
    } catch {
      // Logging must never break a request.
    }
  }

  private importQuery(params: RegisterApiImportOptions = {}): RegisterApiQuery {
    return {
      force: params.force,
      rewrite_schema: params.rewriteSchema,
      clear_records: params.clearRecords,
      add_data: params.addData,
    };
  }

  /** Request returning the parsed result. */
  private async json(options: RequestOptions): Promise<RegisterApiHttpResult> {
    const { response, headers } = await this.execute(options, false);
    const body = this.parseBody(await response.text());
    return { status: response.status, headers, body };
  }

  /** Request returning `body.data`. */
  private async data(options: RequestOptions): Promise<any> {
    const { body } = await this.json(options);
    return body && typeof body === 'object' ? body.data : undefined;
  }

  /** Request returning the response body as a stream. */
  private async stream(options: RequestOptions): Promise<RegisterApiStreamResult> {
    const { response, headers } = await this.execute(options, true);
    if (!response.body) {
      throw new RegisterApiError(RegisterApiErrorMessage.NoResponseBody, { status: response.status, code: 'HTTP_ERROR' });
    }

    return { status: response.status, headers, stream: Readable.fromWeb(response.body as any) };
  }

  /**
   * Do an HTTP request to register. Resolves for 2xx responses with an unread body.
   * @throws {RegisterApiError} On a non-2xx status, a network failure or a timeout.
   */
  private async execute(options: RequestOptions, isStream: boolean): Promise<{ response: Response; headers: Record<string, string> }> {
    const routeTemplate = this.routes[options.routeKey];
    const op = String(options.routeKey);
    const headers: Record<string, string> = {};
    if (this.config.token && options.routeKey !== 'ping') {
      headers.token = this.config.token;
    }
    const traceId = getTraceId();
    if (traceId) {
      headers['x-trace-id'] = traceId;
    }
    if (options.call?.accessInfo !== undefined) {
      headers['access-info'] = Buffer.from(JSON.stringify(options.call.accessInfo), 'utf8').toString('base64');
    }

    let body: any;
    if (options.streamBody) {
      headers['Content-Type'] = CONTENT_TYPE_OCTET_STREAM;
      body = Readable.toWeb(options.streamBody);
    } else if (options.json !== undefined) {
      headers['Content-Type'] = CONTENT_TYPE_JSON;
      body = JSON.stringify(options.json);
    }

    const path = options.id === undefined ? routeTemplate : routeTemplate.replace(':id', encodeURIComponent(String(options.id)));
    const query = options.query ? this.buildQuery(options.query) : '';
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
    const timeout = options.call?.timeout ?? options.defaultTimeout ?? this.timeout;

    const init: any = { method: options.method, headers, body };
    if (options.streamBody) {
      init.duplex = 'half';
    }
    let timer: NodeJS.Timeout | undefined;
    if (timeout > 0) {
      if (isStream) {
        const controller = new AbortController();
        init.signal = controller.signal;
        timer = setTimeout(() => controller.abort(), timeout);
      } else {
        init.signal = AbortSignal.timeout(timeout);
      }
    }

    const startedAt = Date.now();
    this.log(`register-api-${op}-request`, { method: options.method, route: routeTemplate });

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error: any) {
      const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      const apiError = new RegisterApiError(
        isTimeout ? `Register request timed out after ${timeout}ms.` : error?.cause?.message || error?.message || 'Network error',
        { code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR', cause: error },
      );
      this.log(
        `register-api-${op}-error`,
        { method: options.method, route: routeTemplate, durationMs: Date.now() - startedAt, code: apiError.code, message: apiError.message },
        'error',
      );
      throw apiError;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const parsedBody = this.parseBody(await response.text());
      const errorBody = parsedBody?.error;
      let message: string;
      if (typeof errorBody?.message === 'string') {
        message = errorBody.message;
      } else if (typeof parsedBody === 'string' && parsedBody) {
        message = parsedBody;
      } else if (parsedBody) {
        message = JSON.stringify(parsedBody);
      } else {
        message = `Register responded with status ${response.status}.`;
      }
      const apiError = new RegisterApiError(message, {
        status: response.status,
        body: parsedBody,
        code: 'HTTP_ERROR',
        details: errorBody?.details,
        responseCode: errorBody?.code,
      });
      this.log(
        `register-api-${op}-error`,
        { method: options.method, route: routeTemplate, status: response.status, durationMs, code: apiError.code, message: apiError.message },
        'error',
      );
      throw apiError;
    }

    this.log(`register-api-${op}-response`, { method: options.method, route: routeTemplate, status: response.status, durationMs });

    return { response, headers: responseHeaders };
  }

  private parseBody(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Build a query string. Undefined, null and empty objects are skipped; arrays use `key[]=v`;
   * `data`, `data_like`, `sort`, `data_date_from` and `data_date_to` objects use `key[child]=v`;
   * other objects are JSON-stringified.
   */
  private buildQuery(query: RegisterApiQuery): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(`${key}[]`, String(item)));
      } else if (this.isPlainObject(value)) {
        const entries = Object.entries(value);
        if (!entries.length) {
          continue;
        }
        if (BRACKET_QUERY_KEYS.includes(key)) {
          for (const [child, childValue] of entries) {
            if (childValue === undefined || childValue === null) {
              continue;
            }
            params.append(`${key}[${child}]`, typeof childValue === 'object' ? JSON.stringify(childValue) : String(childValue));
          }
        } else {
          params.append(key, JSON.stringify(value));
        }
      } else {
        params.append(key, String(value));
      }
    }

    return params.toString();
  }
}
