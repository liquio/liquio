import { createHash } from 'node:crypto';

import type { PluginsConfig } from '@liquio/plugin-sdk';
import { z } from 'zod';

import { ExternalReaderConfig } from '@components/configuration/configuration.types';

/** Minimum length of the password part of a `user:password` token. */
export const MIN_TOKEN_PASSWORD_LENGTH = 8;

// SHA-256 of the `user:password` token that used to ship in config-templates (`username:password`).
// Stored as a hash so the check does not itself publish a credential. Refused in every environment.
export const KNOWN_DEFAULT_TOKEN_HASHES: string[] = ['bc842c31a9e54efe320d30d948be61291f3ceee4766e36ab25fa65243cd76e0e'];

const PLACEHOLDER_RE = /<?\bREDACTED\b>?|<[^>]*>|changeme|change_me|change-me/i;

const isProduction = (env: string | undefined): boolean => !!env && ['production', 'prod'].includes(env);

const portSchema = z.union([z.number(), z.string()]);

/**
 * Build the schema for the external-reader configuration. Known shipped default tokens are refused in every
 * environment. Empty, placeholder, malformed or short-password tokens are refused in production only;
 * elsewhere they just match nothing. Messages never contain token values.
 * @param env Environment name, `production` and `prod` enable the strict token rules.
 */
export function buildConfigurationSchema(env: string | undefined = process.env.NODE_ENV): z.ZodType<ExternalReaderConfig> {
  const production = isProduction(env);

  return z
    .looseObject({
      auth: z.looseObject({ basicAuthTokens: z.custom<string[]>(() => true).optional() }).optional(),
      server: z.looseObject({
        port: portSchema,
        isSwaggerEnabled: z.boolean().optional(),
      }),
      captcha: z
        .looseObject({
          hmacKey: z.string().optional(),
          isEnabled: z.boolean().optional(),
          isEnabledFor: z.custom<string[]>().optional(),
        })
        .optional(),
      services: z
        .record(
          z.string(),
          z.looseObject({
            isEnabled: z.boolean(),
            class: z.string(),
            options: z.unknown().optional(),
          }),
        )
        .optional(),
      plugins: z.custom<PluginsConfig>().optional(),
    })
    .superRefine((config, ctx) => {
      const tokens: unknown = config.auth?.basicAuthTokens;
      const basePath = ['auth', 'basicAuthTokens'];

      if (!Array.isArray(tokens) || tokens.length === 0) {
        if (production) {
          ctx.addIssue({ code: 'custom', path: basePath, message: 'is empty: configure at least one "user:password" token.' });
        }
        return;
      }

      tokens.forEach((token: unknown, index) => {
        const path = [...basePath, index];
        if (typeof token !== 'string' || token.trim() === '') {
          if (production) ctx.addIssue({ code: 'custom', path, message: 'is empty or not a string.' });
          return;
        }
        if (KNOWN_DEFAULT_TOKEN_HASHES.includes(createHash('sha256').update(token).digest('hex'))) {
          ctx.addIssue({ code: 'custom', path, message: 'is a publicly known default credential from the repository, rotate it.' });
          return;
        }
        if (!production) return;
        if (PLACEHOLDER_RE.test(token)) {
          ctx.addIssue({ code: 'custom', path, message: 'is a placeholder value.' });
          return;
        }
        const separator = token.indexOf(':');
        if (separator < 1) {
          ctx.addIssue({ code: 'custom', path, message: 'must have the form "user:password".' });
        } else if (token.length - separator - 1 < MIN_TOKEN_PASSWORD_LENGTH) {
          ctx.addIssue({ code: 'custom', path, message: `password is shorter than ${MIN_TOKEN_PASSWORD_LENGTH} characters.` });
        }
      });
    });
}
