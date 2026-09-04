import { LoggerService } from '@nestjs/common';

import { Logger } from './logger.interface';
import { ConsoleLogger, NestLogger } from './providers';

// Providers.
export const log: Logger = new ConsoleLogger();

export const nestLogger: LoggerService = new NestLogger();
