import crypto from 'crypto';

import { LogLevel } from '@common/types/log.types';
import { appInfo } from '@lib/app-info';
import { getTraceId } from '@lib/async-local-storage';
import { sensitiveReplace } from '@lib/log/helpers';
import { Logger } from '@lib/log/logger.interface';

// Constants.
const RECORDS_SEPARATOR = '';
const EXCLUDE_PARAMS = ['token', 'authorization', 'Authorization', 'oauth-token'];

export class ConsoleLogger implements Logger {
  save(type: string, data: unknown, level = LogLevel.INFO) {
    const timestamp = Date.now();
    const logId = crypto.randomBytes(6).toString('hex');

    const logData = {
      type,
      data,
      logId,
      level,
      appInfo: {
        name: appInfo.name,
        version: appInfo.version,
      },
      traceId: getTraceId(),
      createdAt: new Date(timestamp).toISOString(),
    };

    const dataToSave = sensitiveReplace(JSON.stringify(logData), EXCLUDE_PARAMS);

    switch (level) {
      case LogLevel.WARNING:
        console.warn(`${dataToSave}${RECORDS_SEPARATOR}`);
        break;
      case LogLevel.ERROR:
        console.error(`${dataToSave}${RECORDS_SEPARATOR}`);
        break;
      default:
        console.log(`${dataToSave}${RECORDS_SEPARATOR}`);
    }
  }
}
