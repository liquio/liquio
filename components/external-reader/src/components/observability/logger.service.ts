import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

import { ConsoleLogger, Injectable, LogLevel, Scope } from '@nestjs/common';

import { sensitiveReplace } from './helpers';
import { AsyncLocalStorageContext } from './observability.module';

// Constants.
const EXCLUDE_PARAMS = ['token', 'authorization', 'Authorization', 'oauth-token'];

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  private appInfo: { name: string; version: string };

  constructor(private readonly als: AsyncLocalStorage<AsyncLocalStorageContext>) {
    super();

    this.prepareAppInfo();
  }

  protected printMessages(
    messages: unknown[],
    context?: string,
    level?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
  ) {
    const [type, data] = messages;

    const logId = randomBytes(6).toString('hex');
    const alsStore = this.als.getStore();

    let traceId: string | undefined;
    if (alsStore) {
      traceId = alsStore.traceId;
    }

    const output = JSON.stringify({
      type: type?.toString() ?? 'unknown',
      data,
      context,
      level,
      logId,
      traceId,
      appInfo: this.appInfo,
      createdAt: new Date().toISOString(),
    });

    const dataToSave = sensitiveReplace(output, EXCLUDE_PARAMS);

    if (writeStreamType === 'stderr') {
      process.stderr.write(dataToSave + '\n');
    } else {
      process.stdout.write(dataToSave + '\n');
    }
  }

  private prepareAppInfo() {
    if (!this.appInfo) {
      try {
        const packageJsonPath = join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        this.appInfo = {
          name: packageJson.name,
          version: packageJson.version,
        };
      } catch {
        const name = process.cwd().split('/').pop() || 'unknown';
        this.appInfo = {
          name,
          version: 'Unknown',
        };
      }
    }
  }
}
