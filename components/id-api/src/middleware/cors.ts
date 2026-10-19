import { Express } from 'express';
import cors from 'cors';
import { Log } from '@liquio/back-core';

import { Config } from '../config';

/**
 * Resolve the CORS allowlist. Fails closed: no config means no cross-origin access,
 * and a wildcard is dropped because responses are always credentialed.
 */
export function resolveAllowedOrigins(configured?: string[]): string[] {
  const list = Array.isArray(configured) ? configured.filter((origin) => typeof origin === 'string' && origin.trim()) : [];
  const origins = list.map((origin) => origin.trim());

  if (origins.includes('*')) {
    const message = "cors.allowedOrigins contains '*', which is not allowed with credentials; ignored";
    try {
      Log.getInstance().save('cors-wildcard-origin-ignored', { message }, 'error');
    } catch {
      // Logger not initialized yet: never let reporting break the fail-closed behaviour.
      console.error(message);
    }
  }

  return origins.filter((origin) => origin !== '*');
}

export function useCors(express: Express & { config: Config }) {
  const config = express.config;

  const allowedOrigins = resolveAllowedOrigins(config.cors?.allowedOrigins);
  const maxAge = config.cors?.maxAge || 60 * 60 * 24 * 365;

  express.use(
    cors({
      // Exact match (scheme + host + port); anything else gets no CORS headers.
      origin: (origin, callback) => callback(null, !!origin && allowedOrigins.includes(origin)),
      credentials: true,
      exposedHeaders: ['Name', 'Version', 'Customer', 'Environment', 'X-Trace-Id'],
      maxAge,
    }),
  );
}
