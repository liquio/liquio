import { z } from 'zod';

import type { NotificationConfig, NotificationRawConfig } from './config.types';

// Accepts anything, optional sections are opaque to the schema.
const anything = <T>() => z.custom<T>(() => true);
// Ports may arrive as numbers or as strings (environment overrides).
const numeric = () => z.custom<number | string>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });

/**
 * Notification config schema for one environment section. Validates only, the loaded object is returned as is.
 */
export const notificationEnvConfigSchema: z.ZodType<NotificationConfig> = z.looseObject({
  processTitle: z.string().optional(),
  port: numeric().optional(),
  trustProxy: anything<number | boolean | string>().optional(),
  tls: anything<NotificationConfig['tls']>().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  host: z.string().optional(),
  dialect: z.string().optional(),
  defaultMessenger: z.string().optional(),
  customAdapter: anything<Record<string, any>>().optional(),
  db: z.looseObject(
    {
      host: z.string().optional(),
      port: numeric().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      dialect: z.string().optional(),
      logging: anything<boolean>().optional(),
      ssl: anything<any>().optional(),
      dialectOptions: anything<Record<string, any>>().optional(),
    },
    { error: 'is not defined' },
  ),
  auth_server: anything<Record<string, any>>().optional(),
  smsServer: anything<Record<string, any>>().optional(),
  adminConfig: anything<Record<string, any>>().optional(),
  corezoidConfig: anything<NotificationConfig['corezoidConfig']>().optional(),
  sendSmsByNotifyhubAPI: anything<boolean>().optional(),
  smtpServer: anything<Record<string, any>>().optional(),
  customer: z.string().optional(),
  environment: z.string().optional(),
  testService: anything<NotificationConfig['testService']>().optional(),
});

/**
 * Builds the schema of the loaded multi-environment config. The active environment section must exist and contain `db`.
 * Messages name settings only, never config values.
 * @param nodeEnv Active environment name (defaults to `NODE_ENV`).
 */
export function buildNotificationConfigSchema(nodeEnv: string | undefined = process.env.NODE_ENV): z.ZodType<NotificationRawConfig> {
  return z.looseObject({ default_env: z.unknown().optional() }).superRefine((cfg, ctx) => {
    const env: unknown = nodeEnv || cfg.default_env || 'test';
    if (typeof env !== 'string' || !env) {
      ctx.addIssue({ code: 'custom', path: ['default_env'], message: 'must be a string' });
      return;
    }

    const section = (cfg as Record<string, unknown>)[env];
    if (typeof section !== 'object' || section === null || Array.isArray(section)) {
      ctx.addIssue({ code: 'custom', path: [env], message: 'is not defined' });
      return;
    }

    const result = notificationEnvConfigSchema.safeParse(section);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: 'custom', path: [env, ...issue.path], message: issue.message });
      }
    }
  }) as unknown as z.ZodType<NotificationRawConfig>;
}
