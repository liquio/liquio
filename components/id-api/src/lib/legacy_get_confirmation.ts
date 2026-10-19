import { NextFunction, Request, Response } from '../types';

interface DeprecationLog {
  save(name: string, data: unknown, level?: string): unknown;
}

/**
 * Whether the deprecated GET (query string) variants of the confirmation code routes are served (SE-3930 IF-05).
 * Reads `config.legacyGetConfirmation`; anything other than an explicit `false` keeps them enabled.
 */
export function isLegacyGetConfirmationEnabled(config: any): boolean {
  const flag = (config as { legacyGetConfirmation?: boolean | string } | undefined)?.legacyGetConfirmation;
  return flag !== false && flag !== 'false';
}

/**
 * Guard for the deprecated variants of the confirmation code routes that carry codes or recipients in the query string.
 * Logs a deprecation warning (method and path only, never the query) and answers 410 when the legacy flag is off.
 *
 * @param log Logger.
 * @param config Application config.
 * @param sensitiveFields When set, the guard applies only if one of these fields arrives in the query (POST routes that also accept a body).
 */
export function legacyConfirmationQueryGuard(log: DeprecationLog, config: any, sensitiveFields?: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (sensitiveFields && !sensitiveFields.some((field) => req.query?.[field] !== undefined)) {
      next();
      return;
    }

    const enabled = isLegacyGetConfirmationEnabled(config);
    log.save('legacy-confirmation-query-deprecated', { method: req.method, path: req.path, enabled }, 'warning');

    if (!enabled) {
      res.status(410).json({ error: 'gone', description: 'Send confirmation codes and recipients in the request body (POST).' });
      return;
    }
    next();
  };
}
