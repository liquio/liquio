import { z } from 'zod';

import type { ManagerConfig } from './config.types';

// Numbers and booleans may arrive as strings (environment overrides).
const numeric = () => z.custom<number | string>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const numericAsNumber = () => z.custom<number>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const flag = () => z.custom<boolean>((v) => typeof v === 'boolean' || typeof v === 'string', { message: 'must be a boolean or a string' });
const objectLike = () => z.custom<Record<string, any>>((v) => typeof v === 'object' && v !== null, { message: 'must be an object' });

const section = z.looseObject({}).optional();

/**
 * Manager config schema. It validates only: the loaded object is returned as is.
 * Required sections are the ones the entrypoint and bootstrap dereference without a guard.
 */
export const managerConfigSchema: z.ZodType<ManagerConfig> = z.looseObject({
  cache: z.looseObject({
    reloadBpmnSchemasInterval: numericAsNumber().optional(),
  }),
  db: z.looseObject({
    host: z.string().optional(),
    port: numeric().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    dialect: z.string().optional(),
  }),
  log: z.looseObject({
    console: objectLike(),
    excludeParams: z.array(z.string()).optional(),
    disableDefaultRedaction: flag().optional(),
  }),
  message_queue: z.looseObject({
    provider: z.string().optional(),
    amqpConnection: z.string().optional(),
    maxHandlingMessages: numericAsNumber().optional(),
    readingQueueName: z.string().optional(),
  }),
  ping: section,
  redis: section,
  server: section,
  system_notifier: section,
  versions: section,
});
