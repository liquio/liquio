import crypto from 'node:crypto';

import type { UnitEntity } from '../entities/unit';
import type { UnitModel } from '../models/unit';
import type { Provider as AuthProvider } from './auth/providers/provider';

// Constants.
const GROUPS_EXIST_CACHE_TTL = 300;
const SYNC_MARK_TTL = 60 * 60 * 24 * 30;
const SYNC_MARK_KEY_PREFIX = 'ldap-unit-sync';
const GROUPS_EXIST_KEY_PREFIX = 'ldap-unit-sync.groups-exist';
const INIT_USER_NAME = 'ldap-sync';

/**
 * Normalize DN for comparison: trim, lowercase and drop whitespace around "," and "=".
 * Keeps the same rules as id-api, which resolves the user groups.
 * @param {string} dn DN.
 * @returns {string} Normalized DN.
 */
export function normalizeDn(dn: string): string {
  return `${dn}`
    .trim()
    .toLowerCase()
    .replace(/\s*([,=])\s*/g, '$1');
}

export interface LdapSyncResult {
  changed: boolean;
  complete: boolean;
}

// Subset of the auth provider user info used by the sync.
export interface LdapUserInfo {
  userId?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  ipn?: string;
  services?: {
    [provider: string]: unknown;
    ldap?: {
      data?: {
        groups?: string[];
        syncedAt?: string;
      };
    };
  };
}

// Data shared by the sync steps of one user.
interface SyncContext {
  userId: string;
  userName: string;
  ipn?: string;
  units: UnitEntity[];
}

type UnitLevel = 'member' | 'head';

// Configured LDAP groups of a unit.
interface UnitGroups {
  memberGroups: string[];
  headGroups: string[];
}

/**
 * Ldap unit sync.
 * Units with `data.ldap.memberGroups` / `data.ldap.headGroups` are LDAP-managed: the user is a member (head) of
 * such a unit if and only if one of the user's groups (resolved by id-api) is listed there.
 * Units without these lists are never touched.
 */
export class LdapUnitSync {
  unitModel: UnitModel;
  auth: AuthProvider;

  /**
   * Constructor.
   * @param {object} deps Dependencies.
   * @param {object} deps.unitModel Unit model.
   * @param {object} deps.auth Auth provider.
   */
  constructor({ unitModel, auth }: { unitModel: UnitModel; auth: AuthProvider }) {
    this.unitModel = unitModel;
    this.auth = auth;
  }

  /**
   * Get configured groups of the unit.
   * @param {object} unit Unit entity.
   * @returns {{memberGroups: string[], headGroups: string[]}}
   */
  static getUnitGroups(unit: UnitEntity): UnitGroups {
    const ldap = unit?.data?.ldap || {};
    const clean = (groups: unknown): string[] =>
      Array.isArray(groups) ? groups.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];

    return { memberGroups: clean(ldap.memberGroups), headGroups: clean(ldap.headGroups) };
  }

  /**
   * Is the unit LDAP-managed.
   * @param {object} unit Unit entity.
   * @returns {boolean}
   */
  static isManaged(unit: UnitEntity): boolean {
    const { memberGroups, headGroups } = LdapUnitSync.getUnitGroups(unit);
    return memberGroups.length > 0 || headGroups.length > 0;
  }

  /**
   * Sync the user with the LDAP-managed units, only if the user's groups were refreshed since the last sync.
   * Never throws. Without redis there is nothing to compare with, so nothing is done.
   * @param {object} userInfo User info from the auth provider.
   * @returns {Promise<LdapSyncResult>}
   */
  async syncIfChanged(userInfo: LdapUserInfo): Promise<LdapSyncResult> {
    const syncedAt = userInfo?.services?.ldap?.data?.syncedAt;
    const result = { changed: false, complete: true };
    if (!syncedAt || !userInfo.userId || !global.redisClient) {
      return result;
    }

    try {
      const lastSyncedAt = await global.redisClient.get(`${SYNC_MARK_KEY_PREFIX}.${userInfo.userId}`);
      if (lastSyncedAt && !(new Date(syncedAt).getTime() > new Date(lastSyncedAt).getTime())) {
        return result;
      }
    } catch (error) {
      global.log.save('ldap-unit-sync|error', { userId: userInfo.userId, error: error?.message }, 'error');
      return result;
    }

    return this.sync(userInfo);
  }

  /**
   * Sync the user with the LDAP-managed units. Never throws.
   * @param {object} userInfo User info from the auth provider.
   * @returns {Promise<LdapSyncResult>}
   */
  async sync(userInfo: LdapUserInfo): Promise<LdapSyncResult> {
    const result = { changed: false, complete: true };
    const ldapService = userInfo?.services?.ldap;
    const userId = userInfo?.userId;
    if (!ldapService || !userId) {
      return result;
    }

    const groups = ldapService.data?.groups;
    if (!Array.isArray(groups)) {
      global.log.save('ldap-unit-sync|groups-not-defined', { userId }, 'error');
      return { changed: false, complete: false };
    }
    const userGroups = new Set(groups.map(normalizeDn));
    const inAnyGroup = (configured: string[]): boolean => configured.some((v) => userGroups.has(normalizeDn(v)));

    try {
      const units = await this.unitModel.getAll();
      const managed = units.filter(LdapUnitSync.isManaged);
      const userName = `${userInfo.last_name || ''} ${userInfo.first_name || ''} ${userInfo.middle_name || ''}`.trim();
      const context: SyncContext = { userId, userName, ipn: userInfo.ipn, units };

      for (const unit of managed) {
        const { memberGroups, headGroups } = LdapUnitSync.getUnitGroups(unit);
        try {
          if (memberGroups.length > 0) {
            const outcome = await this.syncLevel(context, unit, 'member', inAnyGroup(memberGroups), memberGroups);
            result.changed = result.changed || outcome.changed;
            result.complete = result.complete && outcome.complete;
          }
          if (headGroups.length > 0) {
            const outcome = await this.syncLevel(context, unit, 'head', inAnyGroup(headGroups), headGroups);
            result.changed = result.changed || outcome.changed;
            result.complete = result.complete && outcome.complete;
          }
        } catch (error) {
          result.complete = false;
          global.log.save('ldap-unit-sync|unit-error', { userId, unitId: unit.id, error: error?.message }, 'error');
        }
      }

      if (result.changed) {
        await this.unitModel.invalidateCache();
      }
      if (result.complete) {
        await this.rememberSync(userId, ldapService.data?.syncedAt);
      }
    } catch (error) {
      global.log.save('ldap-unit-sync|error', { userId, error: error?.message }, 'error');
      return { changed: result.changed, complete: false };
    }

    global.log.save('ldap-unit-sync|done', { userId, changed: result.changed, complete: result.complete });
    return result;
  }

  /**
   * Sync one access level (member or head) of one managed unit.
   * @private
   */
  private async syncLevel(
    context: SyncContext,
    unit: UnitEntity,
    level: UnitLevel,
    desired: boolean,
    configuredGroups: string[],
  ): Promise<LdapSyncResult> {
    const { userId } = context;
    const listName = level === 'member' ? 'members' : 'heads';
    const isCurrent = unit[listName].includes(userId);
    if (desired === isCurrent) {
      return { changed: false, complete: true };
    }

    // Do not trust the cached list for a write: units are cached and the cache is invalidated asynchronously.
    const fresh = (await this.unitModel.findById(unit.id)) || unit;
    if (desired === fresh[listName].includes(userId)) {
      return { changed: false, complete: true };
    }

    if (desired) {
      await this.addToUnit(context, fresh, level);
      return { changed: true, complete: true };
    }

    // Do not remove anyone because of a group that no longer exists in the directory.
    const verdict = await this.checkGroupsExist(unit.id, configuredGroups);
    if (verdict.failed) {
      return { changed: false, complete: false };
    }
    if (verdict.missing.length > 0) {
      for (const dn of verdict.missing) {
        global.log.save('ldap-unit-sync|group-not-found', { unitId: unit.id, dn, level }, 'warn');
      }
      return { changed: false, complete: false };
    }

    await this.removeFromUnit(context, fresh, level);
    return { changed: true, complete: true };
  }

  /**
   * Add the user to the unit and mirror it to the base units, like the login code does for IPN lists.
   * LDAP-managed base units are skipped: their own groups are the only source of their membership.
   * @private
   */
  private async addToUnit(context: SyncContext, unit: UnitEntity, level: UnitLevel): Promise<void> {
    const { userId } = context;
    const listName = level === 'member' ? 'members' : 'heads';
    const add = level === 'member' ? 'addMember' : 'addHead';

    await this.unitModel[add](unit.id, userId);
    await this.saveHistory(context, unit, level === 'member' ? 'added-to-member-unit' : 'added-to-head-unit');

    for (const baseUnitId of unit.basedOn || []) {
      const baseUnit = context.units.find((v) => v.id === baseUnitId);
      if (!baseUnit || LdapUnitSync.isManaged(baseUnit) || baseUnit[listName].includes(userId)) {
        continue;
      }
      await this.unitModel[add](baseUnitId, userId);
      await this.saveHistory(context, baseUnit, level === 'member' ? 'added-to-member-unit' : 'added-to-head-unit');
    }
  }

  /**
   * Remove the user from the unit. Base units are left as they are: the user could have got access to
   * them by hand or through another unit, and there is no record of what was mirrored by this sync.
   * @private
   */
  private async removeFromUnit(context: SyncContext, unit: UnitEntity, level: UnitLevel): Promise<void> {
    const { userId } = context;

    if (level === 'member') {
      await this.unitModel.removeMember(unit.id, userId);
      await global.models.task.removePerformerUserFromTasks(userId, unit.id);
    } else {
      await this.unitModel.removeHead(unit.id, userId);
    }
    await this.saveHistory(context, unit, level === 'member' ? 'deleted-from-member-unit' : 'deleted-from-head-unit');
  }

  /**
   * Save to access history.
   * @private
   */
  private async saveHistory({ userId, userName, ipn }: SyncContext, unit: UnitEntity, operationType: string): Promise<void> {
    await global.models.accessHistory.create({
      userId,
      userName,
      ipn,
      operationType,
      unitId: unit.id,
      unitName: unit.name,
      initUserName: INIT_USER_NAME,
    });
  }

  /**
   * Check which of the configured groups are gone from the directory.
   * The answer is cached for a short time, so a burst of logins makes one request.
   * @private
   * @param {number} unitId Unit ID (for logs).
   * @param {string[]} groups Configured group DNs.
   * @returns {Promise<{failed: boolean, missing: string[]}>}
   */
  private async checkGroupsExist(unitId: number, groups: string[]): Promise<{ failed: boolean; missing: string[] }> {
    let existing: string[];
    try {
      existing = await this.getExistingGroups(groups);
    } catch (error) {
      global.log.save('ldap-unit-sync|group-check-failed', { unitId, error: error?.message }, 'error');
      return { failed: true, missing: [] };
    }

    const existingSet = new Set(existing.map(normalizeDn));
    return { failed: false, missing: groups.filter((v) => !existingSet.has(normalizeDn(v))) };
  }

  /**
   * Get the existing groups from the cache or from id-api.
   * @private
   */
  private async getExistingGroups(groups: string[]): Promise<string[]> {
    const normalized = [...new Set(groups.map(normalizeDn))].sort();
    const key = `${GROUPS_EXIST_KEY_PREFIX}.${crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`;

    if (global.redisClient) {
      try {
        const cached = await global.redisClient.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        global.log.save('ldap-unit-sync|cache-read-error', { error: error?.message }, 'error');
      }
    }

    const existing = await this.auth.ldapGroupsExist(groups);

    if (global.redisClient) {
      try {
        await global.redisClient.set(key, existing, GROUPS_EXIST_CACHE_TTL);
      } catch (error) {
        global.log.save('ldap-unit-sync|cache-write-error', { error: error?.message }, 'error');
      }
    }

    return existing;
  }

  /**
   * Remember the groups version the units were synced with.
   * @private
   */
  private async rememberSync(userId: string, syncedAt?: string): Promise<void> {
    if (!global.redisClient || !syncedAt) {
      return;
    }

    try {
      await global.redisClient.set(`${SYNC_MARK_KEY_PREFIX}.${userId}`, syncedAt, SYNC_MARK_TTL);
    } catch (error) {
      global.log.save('ldap-unit-sync|error', { userId, error: error?.message }, 'error');
    }
  }
}
