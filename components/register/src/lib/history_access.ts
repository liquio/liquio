import RecordEntity from '../entities/record';
import KeyEntity from '../entities/key';
import KeyModel from '../models/key';
import { canSearchField } from './record_search_access';

/** Thrown when a history snapshot belongs to a key the caller must not read. */
export class HistoryKeyForbiddenError extends Error {
  constructor(public keyId: unknown) {
    super('Key records are not readable.');
  }
}

/**
 * Collect dotted leaf paths of a `record_data_like` filter (the history model nests them under `data`).
 * Returns `undefined` when the filter is malformed.
 */
function collectLikePaths(value: unknown, prefix = ''): string[] | undefined {
  if (value === null || typeof value !== 'object') return prefix ? [prefix] : undefined;
  const paths: string[] = [];
  for (const [name, child] of Object.entries(value)) {
    const nested = collectLikePaths(child, prefix ? `${prefix}.${name}` : name);
    if (!nested) return undefined;
    paths.push(...nested);
  }
  return paths;
}

/** The like filter must not name a column or field that the caller cannot read (it would act as a probe). */
export function canSearchHistoryData(key: KeyEntity, recordDataLike: unknown, tokens: string[]): boolean {
  let parsed: unknown = recordDataLike;
  if (typeof recordDataLike === 'string') {
    try {
      parsed = JSON.parse(recordDataLike);
    } catch {
      return false;
    }
  }
  const paths = collectLikePaths(parsed);
  return !!paths && paths.every((path) => canSearchField(key, path, tokens));
}

/**
 * Applies the key rules (readability, column tokens, `responseFields`) to history snapshots of non-trusted callers.
 * Snapshots are raw `to_jsonb(records)` rows, so the same projection as for live records is used.
 */
export default class HistoryAccess {
  private keys = new Map<number, ReturnType<KeyModel['findById']>>();

  constructor(
    private keyModel: KeyModel,
    private tokens: string[] = [],
    private limitedKeys?: Array<string | number>,
  ) {}

  private async getKey(keyId: number): Promise<KeyEntity | undefined> {
    if (!this.keys.has(keyId)) this.keys.set(keyId, this.keyModel.findById(keyId));
    return (await this.keys.get(keyId))?.data;
  }

  /** Throws `HistoryKeyForbiddenError` for an unreadable key; any other error must fail the request. */
  async assertKeyReadable(keyId: number): Promise<KeyEntity> {
    const key = keyId ? await this.getKey(keyId) : undefined;
    const limited = this.limitedKeys && !this.limitedKeys.map(String).includes(String(keyId));
    if (!key || limited || !this.keyModel.checkRecordsReadable(key)) throw new HistoryKeyForbiddenError(keyId);
    return key;
  }

  /**
   * Returns the projected history. Snapshots of rows the caller has no tokens for are dropped, encrypted data is never returned.
   */
  async project<T extends { keyId?: any; data?: any }>(history: T[]): Promise<T[]> {
    const result: T[] = [];
    for (const entry of history) {
      const key = await this.assertKeyReadable(entry.keyId);
      const snapshot = entry.data;
      if (!snapshot || typeof snapshot !== 'object') continue;

      const rowTokens = snapshot.allow_tokens;
      if (!Array.isArray(rowTokens) || rowTokens.some((token) => typeof token !== 'string')) continue;
      if (rowTokens.length && !rowTokens.some((token) => this.tokens.includes(token))) continue;

      const encrypted = snapshot.is_encrypted || key.isEncrypted || !snapshot.data || typeof snapshot.data !== 'object' || snapshot.data.$encrypted;
      const record = new RecordEntity({
        id: snapshot.id,
        register_id: snapshot.register_id,
        key_id: snapshot.key_id,
        data: encrypted ? {} : structuredClone(snapshot.data),
        meta: snapshot.meta,
        allow_tokens: rowTokens,
        created_by: snapshot.created_by,
        updated_by: snapshot.updated_by,
        created_at: snapshot.created_at,
        updated_at: snapshot.updated_at,
        is_encrypted: snapshot.is_encrypted,
      } as any);
      record.applyColumnLevelSecurity(key, this.tokens).applyResponseFieldsRules(key);

      // Rebuild the snapshot from known fields: search strings and signatures are derived from the hidden data.
      entry.data = {
        id: record.id,
        register_id: record.registerId,
        key_id: record.keyId,
        data: record.data,
        meta: record.meta,
        allow_tokens: record.allowTokens,
        created_by: record.createdBy,
        updated_by: record.updatedBy,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        is_encrypted: record.isEncrypted,
      };
      result.push(entry);
    }
    return result;
  }
}
