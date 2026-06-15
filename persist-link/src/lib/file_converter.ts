// Import.
import axios from 'axios';
import FormData from 'form-data';

import { getLog } from './context';
import { getTraceId } from '../lib/async_local_storage';
import { prepareAxiosErrorToLog } from '../lib/helpers';

// Constants.
const DEFAULT_ROUTES = {
  convertByFileId: '/convert/by-file-id',
  convertByStream: '/convert/by-stream',
};
const MAX_REQUEST_SIZE = 15 * 1024 * 1024; // 15 MB with overhead for multipart form data

/**
 * File converter service.
 */
class FileConverterService {
  /**
   * File converter constructor.
   */
  #clientInstance;
  constructor() {
    // Define singleton.
    if (!FileConverterService.singleton) {
      const { isEnabled, url, token, routes, timeout } = global?.config?.file_converter || {};
      if (!isEnabled) {
        getLog().save('file-converter-service-disabled');
        return;
      }
      if (!url || !token) {
        throw new Error('File converter service configuration error. Check url and token parameters.');
      }
      this.#clientInstance = axios.create({
        baseURL: url,
        headers: {
          Authorization: token,
        },
        timeout,
        maxContentLength: MAX_REQUEST_SIZE,
        maxBodyLength: MAX_REQUEST_SIZE,
      });
      this.routes = { ...DEFAULT_ROUTES, ...routes };

      FileConverterService.singleton = this;
    }

    // Return singleton.
    return FileConverterService.singleton;
  }

  get client() {
    if (!this.#clientInstance) {
      getLog().save('file-converter-service-disabled');
      throw new Error('File converter service is disabled.');
    }
    return this.#clientInstance;
  }

  async convertByStream(fileStream, { fileName, sourceFormat, targetFormat }) {
    if (!fileStream || !fileName || !sourceFormat || !targetFormat) {
      throw new Error('File stream, file name, source format and target format are required for file converting.');
    }
    try {
      const form = new FormData();
      form.append('file', fileStream, { filename: fileName });

      const converterFileStream = await this.client.post(`${this.routes.convertByStream}/${sourceFormat}/to/${targetFormat}`, form, {
        headers: {
          ...form.getHeaders(),
          'x-trace-id': getTraceId(),
        },
        responseType: 'stream',
      });
      getLog().save('file-converter-service|convert-by-stream|success', { fileName, sourceFormat, targetFormat });
      return converterFileStream.data;
    } catch (error) {
      getLog().save(
        'file-converter-service|convert-by-stream|error',
        {
          fileName,
          sourceFormat,
          targetFormat,
          ...prepareAxiosErrorToLog(error),
        },
        'error',
      );
      throw new Error('File converting error.');
    }
  }

  async convertByFileId(fileId, { sourceFormat, targetFormat }) {
    if (!fileId || !sourceFormat || !targetFormat) {
      throw new Error('File ID, source format and target format are required for file converting.');
    }
    try {
      const converterFileStream = await this.client.post(
        `${this.routes.convertByFileId}`,
        {
          fileId,
          sourceFormat,
          targetFormat,
        },
        {
          headers: {
            'x-trace-id': getTraceId(),
          },
          responseType: 'stream',
        },
      );
      getLog().save('file-converter-service|convert-by-file-id|success', { fileId, sourceFormat, targetFormat });
      return converterFileStream.data;
    } catch (error) {
      getLog().save(
        'file-converter-service|convert-by-file-id|error',
        {
          fileId,
          sourceFormat,
          targetFormat,
          ...prepareAxiosErrorToLog(error),
        },
        'error',
      );
      throw new Error('File converting error.');
    }
  }
}

// Export.
export default FileConverterService;
