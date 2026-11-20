import { z } from 'zod';

import type { EventConfig } from './config.types';

// Numbers and booleans may arrive as strings (environment overrides).
const numeric = () => z.custom<number | string>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const flag = () => z.custom<boolean | string>((v) => typeof v === 'boolean' || typeof v === 'string', { message: 'must be a boolean or a string' });

const section = z.looseObject({}).optional();

/**
 * Event config schema. It validates only: the loaded object is returned as is.
 * Required sections are the ones the bootstrap dereferences without a guard.
 */
export const eventConfigSchema: z.ZodType<EventConfig> = z.looseObject({
  app: z.looseObject({
    enabledReadMessageQueueMode: flag().optional(),
    enabledRunDaemonMode: flag().optional(),
  }),
  custom: section,
  custom_logs: section,
  db: z.looseObject({}),
  delayer: section,
  eval_vm: section,
  external_bpmn: section,
  filestorage: z
    .looseObject({
      apiHost: z.string().optional(),
      allowInsecureTls: flag().optional(),
      ca: z.any().optional(),
    })
    .optional(),
  http_client: z.looseObject({ tls: z.array(z.any()).optional() }).optional(),
  log: z.looseObject({
    console: z.any().optional(),
    file: z.array(z.string()).optional(),
    excludeParams: z.array(z.string()).optional(),
    disableDefaultRedaction: flag().optional(),
  }),
  message_queue: z.looseObject({
    maxHandlingMessages: z.any().optional(),
    shutdownDrainTimeoutMs: numeric().optional(),
  }),
  notifier: z
    .looseObject({
      email: z.looseObject({ templateParams: z.looseObject({ frontUrl: z.string().optional() }).optional() }).optional(),
    })
    .optional(),
  persist_link: section,
  ping: section,
  plugins: z.any().optional(),
  redis: z.looseObject({ enabled: flag().optional() }).optional(),
  requester: z
    .looseObject({
      externalService: section,
      registers: z
        .looseObject({
          keysAllowedToDeleteMoreThan100Records: z.array(numeric()).optional(),
          deleteRecordsQueue: z.looseObject({ concurrent: numeric().optional(), interval: numeric().optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
  sandbox: section,
  server: section,
  sign: section,
  stopper: section,
  system_notifier: section,
  trembita: section,
  unit: section,
  user: z.looseObject({ LiquioId: section }).optional(),
  versions: section,
});
