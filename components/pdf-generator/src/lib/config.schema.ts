import { z } from 'zod';

import type { PdfGeneratorConfig } from '../common/types/config.types';

const BASIC_PREFIX = 'Basic ';

// Credentials that used to ship in config/auth.json.default and are publicly known.
const KNOWN_DEFAULT_CREDENTIALS = ['username:password'];

// Ports, timeouts and sizes may arrive as numbers or as strings (environment overrides).
const numeric = () => z.custom<number>((v) => typeof v === 'number' || typeof v === 'string', { message: 'must be a number or a string' });
const flag = () => z.custom<boolean>((v) => typeof v === 'boolean' || typeof v === 'string', { message: 'must be a boolean or a string' });
// Accepts anything, the moved rules below report problems with their own messages.
const anything = <T>() => z.custom<T>(() => true);

function decodeBasicToken(token: unknown): string | null {
  if (typeof token !== 'string' || !token.startsWith(BASIC_PREFIX)) {
    return null;
  }

  const credentials = Buffer.from(token.slice(BASIC_PREFIX.length), 'base64').toString('utf8');

  return credentials.includes(':') ? credentials : null;
}

/**
 * Pdf-generator config schema. Validates only, the loaded object is returned as is.
 * The service must not start without explicitly configured, non-default Basic auth tokens.
 * Messages name settings only, never token values.
 */
export const pdfGeneratorConfigSchema: z.ZodType<PdfGeneratorConfig> = z
  .looseObject({
    server: z.looseObject({
      port: numeric(),
      bodyLimit: z.string().optional(),
      defaultBodyLimit: z.string().optional(),
    }),
    playwright: z
      .looseObject({
        timeout: numeric().optional(),
        workerTimeout: numeric().optional(),
        maxWorkers: numeric().optional(),
        maxConcurrentJobs: numeric().optional(),
        maxQueueSize: numeric().optional(),
        allowedHosts: anything<string[]>().optional(),
        consoleLogLevels: anything<string[]>().optional(),
        consoleLogMaxMessages: numeric().optional(),
        noSandbox: flag().optional(),
      })
      .optional(),
    auth: z.looseObject({ basicAuthTokens: anything<string[]>() }).optional(),
  })
  .superRefine((config, ctx) => {
    const tokens: unknown = config.auth?.basicAuthTokens;
    if (!Array.isArray(tokens) || tokens.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['auth', 'basicAuthTokens'],
        message: 'must contain at least one token. Provide config/auth.json or the KITSOFT_PDF_GENERATOR_auth environment variable.',
      });
      return;
    }

    tokens.forEach((token, index) => {
      const path = ['auth', 'basicAuthTokens', index];
      const credentials = decodeBasicToken(token);
      if (credentials === null) {
        ctx.addIssue({ code: 'custom', path, message: 'must be "Basic <base64(user:password)>"' });
        return;
      }

      if (KNOWN_DEFAULT_CREDENTIALS.includes(credentials)) {
        ctx.addIssue({ code: 'custom', path, message: 'uses publicly known default credentials' });
        return;
      }

      if (credentials.slice(credentials.indexOf(':') + 1).length === 0) {
        ctx.addIssue({ code: 'custom', path, message: 'password must not be empty' });
      }
    });
  });
