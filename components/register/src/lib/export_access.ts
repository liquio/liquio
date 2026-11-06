import RecordEntity from '../entities/record';
import KeyEntity from '../entities/key';
import { Config } from './config';
import { resolveCallerAccess } from './caller_access';

/** Thrown when an export is requested for a key whose records the caller must not read. */
export class ExportKeyForbiddenError extends Error {
  constructor(public keyId: unknown) {
    super('Key records are not readable.');
  }
}

/** Effective export rights of the caller. */
export interface ExportAccess {
  /** Trusted callers (`auth.trustedCallers`, e.g. admin-api) get the unmodified full dump used for backup and migration. */
  full: boolean;
  /** Server-side allow tokens (`auth.userAllowTokens`) used for projected output. */
  tokens: string[];
}

/** Safe default when no access is supplied: projected output without tokens. */
export const RESTRICTED_EXPORT_ACCESS: ExportAccess = { full: false, tokens: [] };

/**
 * Resolve export rights from the Basic user. Client-supplied flags are never honoured here.
 * @throws On malformed `auth.trustedCallers` / `auth.userAllowTokens` config.
 */
export function resolveExportAccess(req: { auth?: { user?: string } }, config: Pick<Config, 'auth'>): ExportAccess {
  const access = resolveCallerAccess(req, config);
  return { full: access.trusted, tokens: access.allowTokens };
}

const isReadable = (key: KeyEntity | undefined): boolean => !!key && key.accessMode !== undefined && key.accessMode !== 'write_only';

/** Same rule as `KeyModel.checkRecordsReadable` (kept pure so it can be used without a model). */
export function isKeyExportable(key: KeyEntity | undefined): boolean {
  return isReadable(key);
}

/**
 * Project records of one key for a non-full export: drops rows protected by foreign allow tokens, applies column and
 * `responseFields` rules and removes derived search strings of every record that had any field hidden.
 * Does not check key readability (callers must skip or reject unreadable keys first).
 */
export function projectRecordsForExport(records: RecordEntity[], key: KeyEntity, tokens: string[] = []): RecordEntity[] {
  const result: RecordEntity[] = [];
  for (const record of records || []) {
    const rowTokens = record.allowTokens;
    if (rowTokens !== undefined && rowTokens !== null) {
      if (!Array.isArray(rowTokens) || !rowTokens.every((t) => typeof t === 'string')) continue;
      if (rowTokens.length > 0 && !rowTokens.some((t) => tokens.includes(t))) continue;
    }

    const before = JSON.stringify(record.data ?? null);
    record.applyColumnLevelSecurity(key, tokens).applyResponseFieldsRules(key);
    if (JSON.stringify(record.data ?? null) !== before) {
      delete record.searchString;
      delete record.searchString2;
      delete record.searchString3;
    }
    result.push(record);
  }
  return result;
}
