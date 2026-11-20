import RecordEntity from '../entities/record';
import KeyModel from '../models/key';

/** Authorize linked (`join_by`) data independently of client-controlled primary-record flags. */
export default class JoinedRecordAccess {
  private keys = new Map<number, ReturnType<KeyModel['findById']>>();

  constructor(
    private keyModel: KeyModel,
    private tokens: string[] = [],
    private limitedKeys?: Array<string | number>,
    private onError?: (error: Error) => void,
  ) {}

  /**
   * Replace `primary.joined` (a raw RecordEntity) with `{ id, data }` or `null` when the caller must not see it.
   * Any error results in `joined: null`.
   */
  async protect(primary: RecordEntity, reference: string): Promise<void> {
    const joined = (primary as any).joined as RecordEntity;
    if (!joined) return;
    // Clear the raw link before any operation that can fail.
    (primary as any).joined = null;
    try {
      if (!Object.prototype.hasOwnProperty.call(primary.data || {}, reference)) return;
      if (!joined.keyId || (this.limitedKeys && !this.limitedKeys.map(String).includes(String(joined.keyId)))) return;
      if (!Array.isArray(joined.allowTokens) || joined.allowTokens.some((token) => typeof token !== 'string')) return;
      if (joined.allowTokens.length && !joined.allowTokens.some((token) => this.tokens.includes(token))) return;
      if (!this.keys.has(joined.keyId)) this.keys.set(joined.keyId, this.keyModel.findById(joined.keyId));
      const key = (await this.keys.get(joined.keyId))?.data;
      if (!key || !this.keyModel.checkRecordsReadable(key)) return;
      // Never expose encrypted linked data.
      if (joined.isEncrypted || !joined.data || typeof joined.data !== 'object' || joined.data['$encrypted']) return;
      const record = new RecordEntity({
        id: joined.id,
        key_id: joined.keyId,
        allow_tokens: joined.allowTokens,
        data: structuredClone(joined.data),
      } as any);
      record.applyColumnLevelSecurity(key, this.tokens).applyResponseFieldsRules(key);
      (primary as any).joined = { id: record.id, data: record.data };
    } catch (error) {
      this.onError?.(error);
    }
  }

  /** Trusted callers keep the unfiltered join; still only `{ id, data }`. */
  static exposeUnfiltered(primary: RecordEntity): void {
    const joined = (primary as any).joined as RecordEntity;
    if (!joined) return;
    (primary as any).joined = { id: joined.id, data: joined.data };
  }
}
