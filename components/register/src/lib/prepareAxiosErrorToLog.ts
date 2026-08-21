import { AxiosError } from 'axios';

/**
 * @param {error} error. AxiosError.
 * @param {object} options. Options.
 * @param {boolean} options.withHeaders With headers.
 * @return {object} Object to log.
 */
export default function prepareAxiosErrorToLog(error: any, { withHeaders = false } = {}) {
  // Prepare axios error only.
  if (!(error instanceof AxiosError)) return { error: error.toString() };
  const result: any = {
    error: error.message || 'UNKNOWN_ERROR_MESSAGE', // "Request failed with status code 404 || "timeout of 30000ms exceeded"
    code: error.code || 'UNKNOWN_ERROR_CODE', // "ERR_BAD_REQUEST" || "ESOCKETTIMEDOUT"
    status: error.response?.status || error.status || 'UNKNOWN_ERROR_STATUS', // 404 || 500 || "UNKNOWN_ERROR_STATUS"
    statusText: error.response?.statusText, // "Not Found" || null
    responseData: error.response?.data || {}, // { "error": "File not found" }
    url: `${error.config?.baseURL ? error.config.baseURL : ''}${error.config?.url}`, // "https://api.example.com/files/12345"
    method: (error.config?.method || '').toUpperCase() // GET || POST
  };
  if (withHeaders) result.headers = error.config?.headers || {};
  return result;
}
