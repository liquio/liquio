const crypto = require('crypto');

const Sign = require('../services/sign');
const Register = require('../services/register');
const Task = require('../services/task');
const Auth = require('../services/auth');

// Constants.
const DEFAULT_CACHE_LIFE_TIME_SECONDS = 10; // Default life time for cache - 10 seconds.

/**
 * Assets business.
 */
class AssetsBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!AssetsBusiness.singleton) {
      this.config = config;
      this.cache = new Map();
      this.sign = new Sign(config.sign);
      this.register = new Register();
      this.task = new Task();
      this.auth = new Auth();
      AssetsBusiness.singleton = this;
    }

    // Return singleton.
    return AssetsBusiness.singleton;
  }
  /**
   * Get to units.
   * @param {string[]} usersIds Users ids.
   * @returns {string} encryptedDataResult.
   */
  async getToUnits(usersIds) {
    const timestampStart = Date.now();
    const usersIdsSorted = usersIds.sort((a, b) => (a > b ? 1 : -1));
    const cacheKeyName = crypto.createHash('sha1').update(JSON.stringify(usersIdsSorted)).digest('hex');
    const CALLER = 'getToUnits';
    const encryptCert = this.config?.assets?.encryptCert;
    if (!encryptCert) {
      throw new Error('Can not find encrypt cert');
    }

    // Return data from cache if can.
    const dataFromCache = this.getCacheData(cacheKeyName, CALLER);
    if (dataFromCache) {
      log.save('assets-get-to-units-result-from-cache', { usersIds, executingTime: `${Date.now() - timestampStart} ms` });
      return dataFromCache;
    }
    const dbResponse = await models.unit.getAccessedUsersToUnits();

    const result = dbResponse.map((el) => ({
      key: `unit.${el.access_index}`,
      userIds: el.user_ids.filter((id) => usersIdsSorted.includes(id)),
    }));

    let encryptedDataResult;
    try {
      const signerResponse = await this.sign.encrypt(encryptCert, Buffer.from(JSON.stringify(result), 'utf8').toString('base64'));
      encryptedDataResult = signerResponse.data;
    } catch (error) {
      log.save('assets-get-to-units-encrypting-result-error', { error: error?.message }, 'error');
      throw error;
    }

    this.setCacheData(cacheKeyName, CALLER, encryptedDataResult);
    log.save('assets-get-to-units-result', { result, executingTime: `${Date.now() - timestampStart} ms` });
    return encryptedDataResult;
  }

  /**
   * Get to registers.
   * @param {string[]} usersIds Users ids.
   * @returns {string} encryptedDataResult.
   */
  async getToRegisters(usersIds) {
    const timestampStart = Date.now();
    const usersIdsSorted = usersIds.sort((a, b) => (a > b ? 1 : -1));
    const cacheKeyName = crypto.createHash('sha1').update(JSON.stringify(usersIdsSorted)).digest('hex');
    const CALLER = 'getToRegisters';
    const encryptCert = this.config?.assets?.encryptCert;
    if (!encryptCert) {
      throw new Error('Can not find encrypt cert');
    }

    // Return data from cache if can.
    const dataFromCache = this.getCacheData(cacheKeyName, CALLER);
    if (dataFromCache) {
      log.save('assets-get-to-registers-result-from-cache', { usersIds, executingTime: `${Date.now() - timestampStart} ms` });
      return dataFromCache;
    }

    let getKeysResult;
    try {
      getKeysResult = await this.register.getKeys({ limit: 1000000 });
    } catch (error) {
      log.save('assets-get-to-registers-get-keys-error', { error: error?.message }, 'error');
      throw error;
    }
    const existingKeysIdsSorted = getKeysResult.data.map(({ id }) => id).sort((a, b) => a - b);

    const ACCESS_TYPES = ['read', 'create', 'delete', 'update', 'history'];

    const keysToUnitAccess = existingKeysIdsSorted.reduce((acc, keyId) => {
      ACCESS_TYPES.forEach((accessType) => {
        acc[`register.${keyId}.${accessType}`] = [];
      });
      return acc;
    }, {}); // { "register.1.read": [], "register.1.create": [],"register.1.delete": [], ... }

    const usersUnits = (await models.unit.getAll({ filters: { heads: usersIdsSorted, members: usersIdsSorted } })).map(
      ({ id, members = [], heads = [] }) => ({
        id,
        users: [...new Set([...heads, ...members])].filter((id) => usersIdsSorted.includes(id)),
      }),
    ); //[ { id: 1000000234, users: ["<user1Id>", "<user2Id>", ... ] }, ... ]

    const usersUnitsIds = usersUnits.map(({ id }) => id);

    let unitAccessResponse;
    try {
      unitAccessResponse = await this.task.getUnitAccess({ type: 'register' });
    } catch (error) {
      log.save('assets-get-to-registers-get-unit-access-error', { error: error?.message }, 'error');
      throw error;
    }
    const unitAccessFiltered = unitAccessResponse.filter(({ unitId }) => usersUnitsIds.includes(unitId));
    const unitAccessPrepared = unitAccessFiltered.map((el) => ({
      unitId: el.unitId,
      read: el.data.keys?.allowRead || [],
      create: el.data.keys?.allowCreate || [],
      delete: el.data.keys?.allowDelete || [],
      update: el.data.keys?.allowUpdate || [],
      history: el.data.keys?.allowHistory || [],
    })); // [{ unitId: 3134301, read: [2016, 2298, 2390, 2448,], create: [], delete: [], update: [2016, 2448], history: []}, ...]

    unitAccessPrepared.forEach((ua) => {
      ACCESS_TYPES.forEach((accessType) => {
        ua[accessType].forEach((keyId) => {
          const prop = `register.${keyId}.${accessType}`;
          if (keysToUnitAccess[prop]) keysToUnitAccess[prop] = keysToUnitAccess[prop].concat(ua.unitId);
        });
      });
    });

    const result = Object.entries(keysToUnitAccess).map(([prop, units]) => {
      const userIds = [];
      units.forEach((unitId) => userIds.push(...usersUnits.find((el) => el.id === unitId).users));
      return {
        key: prop,
        userIds: [...new Set(userIds)],
      };
    });

    let encryptedDataResult;
    try {
      const signerResponse = await this.sign.encrypt(encryptCert, Buffer.from(JSON.stringify(result), 'utf8').toString('base64'));
      encryptedDataResult = signerResponse.data;
    } catch (error) {
      log.save('assets-get-to-registers-encrypting-result-error', { error: error?.message }, 'error');
      throw error;
    }
    this.setCacheData(cacheKeyName, CALLER, encryptedDataResult);
    log.save('assets-get-to-registers-result', { result, executingTime: `${Date.now() - timestampStart} ms` });
    return encryptedDataResult;
  }

  /**
   * Reset all cached data.
   * @returns {void}
   */
  resetCache() {
    this.cache.clear();
  }

  /**
   * Get cached data for a specific caller and cache key.
   * @private
   * @param {string} cacheKeyName The cache key name.
   * @param {string} caller The caller identifier.
   * @returns {*|null} The cached data or null if not found/expired.
   */
  getCacheData(cacheKeyName, caller) {
    if (!cacheKeyName || !caller) return false;
    const cacheName = `${caller}Cash`;
    this.actualizeCache(cacheName);
    const cacheForCaller = this.cache.get(cacheName) || {};
    const { timeStamp, data, lifeTime = DEFAULT_CACHE_LIFE_TIME_SECONDS } = cacheForCaller[cacheKeyName] || {};

    // Check cache is empty.
    if (!data || !timeStamp) return null;

    // Check live time is expired.
    if (Date.now() - timeStamp >= lifeTime * 1000) {
      delete cacheForCaller[cacheKeyName];
      this.cache.set(cacheName, cacheForCaller);
      return null;
    }
    return data;
  }

  /**
   * Set cached data for a specific caller and cache key.
   * @private
   * @param {string} cacheKeyName The cache key name.
   * @param {string} caller The caller identifier.
   * @param {*} data The data to cache.
   */
  setCacheData(cacheKeyName, caller, data) {
    if (!cacheKeyName || !caller) return;
    const cacheName = `${caller}Cash`;
    const cacheForCaller = this.cache.get(cacheName) || {};

    cacheForCaller[cacheKeyName] = { ...cacheForCaller[cacheKeyName], timeStamp: Date.now(), data };
    this.cache.set(cacheName, cacheForCaller);
  }

  /**
   * Clean up expired cache entries for a specific caller.
   * @private
   * @param {string} cacheName The cache name identifier.
   */
  actualizeCache(cacheName) {
    const cacheForCaller = this.cache.get(cacheName) || {};
    for (const cacheKeyName in cacheForCaller) {
      const { timeStamp, lifeTime = DEFAULT_CACHE_LIFE_TIME_SECONDS } = cacheForCaller[cacheKeyName];
      if (Date.now() - timeStamp >= lifeTime * 1000) {
        delete cacheForCaller[cacheKeyName];
      }
    }
    this.cache.set(cacheName, cacheForCaller);
  }
}

module.exports = AssetsBusiness;
