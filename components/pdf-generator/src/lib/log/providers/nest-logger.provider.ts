import { LoggerService } from '@nestjs/common';

import { LogLevel } from '@common/types/log.types';
import { log } from '@lib/log';

export class NestLogger implements LoggerService {
  log(message: unknown) {
    log.save('nest-app', message, LogLevel.INFO);
  }
  error(error: Error) {
    log.save(
      'nest-app',
      {
        message: error.message || error.toString() || JSON.stringify(error),
        stack: error.stack,
      },
      LogLevel.ERROR,
    );
  }
  warn(message: unknown) {
    log.save('nest-app', message, LogLevel.WARNING);
  }
  debug?(message: unknown) {
    log.save('nest-app', message, LogLevel.INFO);
  }
}
