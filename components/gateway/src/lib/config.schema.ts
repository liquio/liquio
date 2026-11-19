import { z } from 'zod';

import type { GatewayConfig } from './config.types';

// Numbers and booleans may arrive as strings (environment overrides).
const numericAsNumber = () => z.custom<number>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const flag = () => z.custom<boolean>((v) => typeof v === 'boolean' || typeof v === 'string', { message: 'must be a boolean or a string' });
const objectLike = () => z.custom<Record<string, any>>((v) => typeof v === 'object' && v !== null, { message: 'must be an object' });

const section = () => objectLike().optional();

/**
 * Gateway config schema. It validates only: the loaded object is returned as is.
 * Required sections are the ones bootstrap dereferences without a guard.
 */
export const gatewayConfigSchema: z.ZodType<GatewayConfig> = z.looseObject({
  db: objectLike(),
  eval_vm: section(),
  log: z.looseObject({
    // May be an array in config templates; bootstrap reads `.name` from it.
    console: z.custom<GatewayConfig['log']['console']>((v) => typeof v === 'object' && v !== null, { message: 'must be an object' }),
    excludeParams: z.any().optional(),
    disableDefaultRedaction: flag().optional(),
  }),
  message_queue: z.looseObject({
    maxHandlingMessages: numericAsNumber().optional(),
    dedup: section(),
  }),
  ping: section(),
  redis: z
    .looseObject({
      isEnabled: flag().optional(),
      host: z.custom<string>((v) => v === undefined || typeof v === 'string', { message: 'must be a string' }),
      port: z.custom<number>((v) => v === undefined || typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' }),
      amqpMessageCache: section(),
    })
    .optional(),
  sandbox: section(),
  server: section(),
  system_notifier: section(),
  versions: section(),
});
