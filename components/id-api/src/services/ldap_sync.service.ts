import { Op } from 'sequelize';
import * as ldapts from 'ldapts';

import { UserServicesAttributes } from '../models';
import { BaseService } from './base_service';
import { LdapAmbiguousUserError, firstString, normalizeDn } from './ldap.service';

const DEFAULT_INTERVAL_MINUTES = 15;
const BATCH_SIZE = 100;
const LOCK_NAME = 'ldap-sync';
const LOCK_TTL_SECONDS = 300;
// The lock is extended when this share of its TTL has passed.
const LOCK_RENEW_SHARE = 1 / 3;
// A run is given up after this many errors in a row: the directory is most likely unusable (bind rejected, base missing, ...).
const MAX_CONSECUTIVE_ERRORS = 5;

export type LdapSyncStatus = 'unchanged' | 'changed' | 'revoked' | 'already-revoked';
export type LdapRevokeReason = 'deleted' | 'disabled' | 'not-in-access-group';

export interface LdapSyncOutcome {
  userId: string;
  status: LdapSyncStatus;
  reason?: LdapRevokeReason;
}

export interface LdapSyncSummary {
  checked: number;
  revoked: number;
  changed: number;
  errors: number;
  durationMs: number;
  aborted: boolean;
}

export interface LdapCheckOptions {
  // Also remove tokens and sessions of a user who was already revoked. The job skips them to save work.
  ensureRevoked?: boolean;
}

// The directory could not answer. Nothing was changed for the user.
export class LdapDirectoryError extends Error {
  constructor(
    readonly original: unknown,
    // The directory as a whole is unusable (no connection, TLS, timeout), not just this one lookup.
    readonly connectionLevel: boolean,
  ) {
    super(`Directory error: ${original instanceof Error ? original.message : original}`);
    this.name = 'LdapDirectoryError';
  }
}

interface LdapUserData {
  sAMAccountName?: string;
  userPrincipalName?: string;
  dn?: string;
  cn?: string;
  groups?: string[];
  accessGroups?: string[];
  syncedAt?: string;
  [key: string]: unknown;
}

// Compare lists of DNs as sets.
function sameDnSet(a: string[] = [], b: string[] = []): boolean {
  const left = new Set(a.map(normalizeDn));
  const right = new Set(b.map(normalizeDn));
  return left.size === right.size && [...left].every((dn) => right.has(dn));
}

/**
 * Re-checks the users who logged in through ldap against the directory: revokes access when it is lost
 * and refreshes the groups that task builds unit membership from.
 */
export class LdapSyncService extends BaseService {
  private timer?: NodeJS.Timeout;
  private running = false;
  private redisDisabledLogged = false;

  /// The ldap provider and its sync are both switched on.
  get isSyncEnabled(): boolean {
    return this.service('ldap').isEnabled && !!this.config.auth_providers?.ldap?.sync?.isEnabled;
  }

  get intervalMinutes(): number {
    const value = this.config.auth_providers?.ldap?.sync?.intervalMinutes;
    return typeof value === 'number' && value > 0 ? value : DEFAULT_INTERVAL_MINUTES;
  }

  /// Start the periodic job. Nothing is scheduled without redis: the lock is what keeps replicas from running it together.
  schedule(): void {
    if (this.timer || !this.isSyncEnabled) {
      return;
    }

    if (!this.service('redis').isEnabled) {
      this.logRedisDisabled();
      return;
    }

    this.timer = setInterval(
      () => {
        this.run().catch((error: any) => {
          this.log.save('ldap-sync|run-error', { error: error?.message ?? `${error}` }, 'error');
        });
      },
      this.intervalMinutes * 60 * 1000,
    );
    // The job must not keep the process alive.
    this.timer.unref();

    this.log.save('ldap-sync|scheduled', { intervalMinutes: this.intervalMinutes }, 'info');
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Check every ldap user once. Does nothing if sync or redis is off, another run is in progress here,
   * or another replica holds the lock.
   */
  async run(): Promise<LdapSyncSummary | undefined> {
    if (!this.isSyncEnabled) {
      return undefined;
    }

    const redis = this.service('redis');
    if (!redis.isEnabled) {
      this.logRedisDisabled();
      return undefined;
    }

    if (this.running) {
      this.log.save('ldap-sync|skipped', { reason: 'already-running' }, 'info');
      return undefined;
    }
    this.running = true;

    try {
      const token = await redis.acquireLock(LOCK_NAME, LOCK_TTL_SECONDS);
      if (!token) {
        this.log.save('ldap-sync|skipped', { reason: 'lock-held' }, 'info');
        return undefined;
      }

      try {
        return await this.syncAll(token);
      } finally {
        await redis.releaseLock(LOCK_NAME, token).catch((error: any) => {
          this.log.save('ldap-sync|release-lock-error', { error: error?.message ?? `${error}` }, 'error');
        });
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Check one user against the directory and apply the result. Throws `LdapDirectoryError` when the directory cannot
   * answer; in that case nothing is changed. Resolves to null if the user has no ldap record.
   */
  async checkUserById(userId: string, options: LdapCheckOptions = {}): Promise<LdapSyncOutcome | null> {
    const service = await this.model('userServices')
      .findOne({ where: { userId, provider: 'ldap' } })
      .then((row) => row?.dataValues);

    return service ? this.checkUser(service, options) : null;
  }

  /**
   * Whether a refresh token of the user may be exchanged. Access lost: revokes and refuses. Directory down: allows
   * (an outage must not log everyone out, the job behaves the same). Other failures refuse.
   */
  async isRefreshAllowed(userId: string): Promise<boolean> {
    if (!this.isSyncEnabled) {
      return true;
    }

    try {
      const outcome = await this.checkUserById(userId, { ensureRevoked: true });
      return !outcome || (outcome.status !== 'revoked' && outcome.status !== 'already-revoked');
    } catch (error: any) {
      if (error instanceof LdapDirectoryError) {
        this.log.save('ldap-sync|refresh-check-skipped', { userId, error: error.message }, 'warning');
        return true;
      }
      throw error;
    }
  }

  async checkUser(service: UserServicesAttributes, options: LdapCheckOptions = {}): Promise<LdapSyncOutcome> {
    const ldap = this.service('ldap');
    const data = (service.data ?? {}) as LdapUserData;

    let entry: ldapts.Entry | null;
    let groups: string[] = [];
    let reason: LdapRevokeReason | undefined;
    let matched: string[] = [];

    // `findUserById` returns null only when the directory answered "no such user"; any failure throws.
    try {
      entry = await ldap.findUserById(service.provider_id);
      if (!entry) {
        reason = 'deleted';
      } else if (ldap.isAccountDisabled(entry)) {
        reason = 'disabled';
      } else {
        groups = await ldap.getUserGroups(entry);
        const accessGroups = this.config.auth_providers?.ldap?.accessGroups ?? [];
        matched = accessGroups.filter((accessGroup) => groups.some((group) => ldap.isSameDn(group, accessGroup)));
        if (matched.length === 0) {
          reason = 'not-in-access-group';
        }
      }
    } catch (error: any) {
      // A result code (no such base, insufficient access, ...) concerns this lookup; anything else is a transport failure.
      const connectionLevel = !(error instanceof ldapts.ResultCodeError) && !(error instanceof LdapAmbiguousUserError);
      throw new LdapDirectoryError(error, connectionLevel);
    }

    if (reason) {
      return this.revoke(service, data, reason, options);
    }

    return this.update(service, data, entry!, groups, matched);
  }

  private async revoke(
    service: UserServicesAttributes,
    data: LdapUserData,
    reason: LdapRevokeReason,
    options: LdapCheckOptions,
  ): Promise<LdapSyncOutcome> {
    const { userId } = service;
    const auth = this.service('auth');

    // A user is marked as revoked by empty groups; the mark is written last, so a failed revoke is retried on the next run.
    if ((data.accessGroups ?? []).length === 0 && (data.groups ?? []).length === 0) {
      if (options.ensureRevoked) {
        await auth.revokeUserAccess(userId);
      }
      return { userId, status: 'already-revoked', reason };
    }

    const result = await auth.revokeUserAccess(userId);
    await this.model('userServices').update(
      { data: { ...data, groups: [], accessGroups: [], syncedAt: new Date().toISOString() } },
      { where: { id: service.id } },
    );
    await auth.invalidateUserCache(userId);

    this.log.save('ldap-sync|access-revoked', { userId, reason, ...result }, 'info');
    return { userId, status: 'revoked', reason };
  }

  private async update(
    service: UserServicesAttributes,
    data: LdapUserData,
    entry: ldapts.Entry,
    groups: string[],
    matched: string[],
  ): Promise<LdapSyncOutcome> {
    const { userId } = service;
    const auth = this.service('auth');

    const attributes = {
      dn: entry.dn,
      cn: firstString(entry.cn),
      sAMAccountName: firstString(entry.sAMAccountName),
      userPrincipalName: firstString(entry.userPrincipalName),
    };
    const groupsChanged = !sameDnSet(data.groups, groups) || !sameDnSet(data.accessGroups, matched);
    const attributesChanged = (Object.keys(attributes) as (keyof typeof attributes)[]).some((key) => data[key] !== attributes[key]);

    if (!groupsChanged && !attributesChanged) {
      return { userId, status: 'unchanged' };
    }

    // syncedAt moves only with the groups: task re-syncs units when it is newer than its last sync.
    await this.model('userServices').update(
      { data: { ...data, ...attributes, groups, accessGroups: matched, syncedAt: groupsChanged ? new Date().toISOString() : data.syncedAt } },
      { where: { id: service.id } },
    );
    await auth.invalidateUserCache(userId);

    if (!groupsChanged) {
      this.log.save('ldap-sync|attributes-changed', { userId }, 'info');
      return { userId, status: 'unchanged' };
    }

    // Tokens stay valid, task just has to build the user info again.
    await auth.invalidateUserTokenCache(userId);

    const before = new Set((data.groups ?? []).map(normalizeDn));
    const after = new Set(groups.map(normalizeDn));
    this.log.save(
      'ldap-sync|groups-changed',
      { userId, added: [...after].filter((dn) => !before.has(dn)).length, removed: [...before].filter((dn) => !after.has(dn)).length },
      'info',
    );
    return { userId, status: 'changed' };
  }

  private async syncAll(lockToken: string): Promise<LdapSyncSummary> {
    const redis = this.service('redis');
    const startedAt = Date.now();
    const summary: LdapSyncSummary = { checked: 0, revoked: 0, changed: 0, errors: 0, durationMs: 0, aborted: false };

    let lastLockRenewal = Date.now();
    let consecutiveErrors = 0;
    let lastId = 0;

    this.log.save('ldap-sync|started', {}, 'info');

    batches: for (;;) {
      const rows = await this.model('userServices')
        .findAll({ where: { provider: 'ldap', id: { [Op.gt]: lastId } }, order: [['id', 'ASC']], limit: BATCH_SIZE })
        .then((found) => found.map((row) => row.dataValues));

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        lastId = row.id;

        if (Date.now() - lastLockRenewal > LOCK_TTL_SECONDS * 1000 * LOCK_RENEW_SHARE) {
          if (!(await redis.extendLock(LOCK_NAME, lockToken, LOCK_TTL_SECONDS))) {
            this.log.save('ldap-sync|aborted', { reason: 'lock-lost' }, 'error');
            summary.aborted = true;
            break batches;
          }
          lastLockRenewal = Date.now();
        }

        try {
          const outcome = await this.checkUser(row);
          summary.checked++;
          summary.revoked += outcome.status === 'revoked' ? 1 : 0;
          summary.changed += outcome.status === 'changed' ? 1 : 0;
          consecutiveErrors = 0;
        } catch (error: any) {
          summary.errors++;
          consecutiveErrors++;
          this.log.save('ldap-sync|user-error', { userId: row.userId, error: error?.message ?? `${error}` }, 'error');

          if ((error instanceof LdapDirectoryError && error.connectionLevel) || consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            this.log.save('ldap-sync|aborted', { reason: 'directory-unavailable' }, 'error');
            summary.aborted = true;
            break batches;
          }
        }
      }
    }

    summary.durationMs = Date.now() - startedAt;
    this.log.save('ldap-sync|done', { ...summary }, summary.errors > 0 ? 'warning' : 'info');
    return summary;
  }

  private logRedisDisabled(): void {
    if (!this.redisDisabledLogged) {
      this.redisDisabledLogged = true;
      this.log.save('ldap-sync|disabled', { reason: 'redis is required for the lock' }, 'warning');
    }
  }
}
