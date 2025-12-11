import { LogLevel } from '@common/types/log.types';

export interface Logger {
  save(type: string, data: unknown, level?: LogLevel): void;
}
