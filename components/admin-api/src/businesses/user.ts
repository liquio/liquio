import _ from 'lodash';
import { IdApiClient, IdApiError, getIdApiClient } from '@liquio/back-core';

import { NotifierService } from '../services/notifier';
import { TestUserChecker } from '../lib/test_user_checker';
import { ForbiddenError } from '../lib/errors';

// Constants.
const ERROR_CODE_HTTP = 'HTTP_ERROR';

/**
 * User business.
 */
export class UserBusiness {
  private static singleton: UserBusiness;

  public config: any;
  public idApiClient: IdApiClient;
  public notifierService: NotifierService;
  public testUserChecker: TestUserChecker;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserBusiness.singleton) {
      this.config = config;
      this.idApiClient = getIdApiClient();
      this.notifierService = new NotifierService();
      this.testUserChecker = new TestUserChecker();
      UserBusiness.singleton = this;
    }

    // Return singleton.
    return UserBusiness.singleton;
  }

  /**
   * Search users.
   * @param {object}
   * @returns {Promise<object[]>}
   */
  async search({ search, ids, code, briefInfo }) {
    let users = [];
    if (search) {
      users.push(...(await this.idApiClient.searchUsers(search)));
    }
    if (ids) {
      users.push(...(await this.idApiClient.getUsersByIds(ids, { withPrivateProps: false, briefInfo })));
    }
    if (code) {
      users.push(await this.idApiClient.getUserByCode(code));
    }

    const uniqueUsers = _.uniqBy(users, 'userId');

    return uniqueUsers;
  }

  /**
   * Get users.
   * @param {object}
   * @returns {Promise<object[]>}
   */
  async getUsers({ id, email, phone, search, ipn, role, offset, limit }) {
    const { headers, body: users } = await this.idApiClient.getUsersPage({
      id,
      email,
      phone,
      search,
      ipn,
      role,
      offset,
      limit,
    });

    const units = await global.models.unit.getAll();

    for (const user of users) {
      const heads = units.filter((v) => v.heads.includes(user.userId));
      const members = units.filter((v) => v.members.includes(user.userId));
      const all = [...new Set([...heads, ...members])];

      user.units = {
        heads: heads.map((v) => v.id),
        members: members.map((v) => v.id),
        all: all.map((v) => v.id),
      };
    }

    let data = { pagination: { total: 0 }, data: [] };

    if (users.length > 0) {
      data.pagination.total = parseInt(headers.total);
      data.data = users;
    }

    return data;
  }

  /**
   * Find by user ID.
   * @param {number} id ID.
   * @returns {Promise<object>}
   */
  async findByUserId(id) {
    const user = await this.idApiClient.findUserById(id);
    if (!user) {
      return user;
    }

    const units = await global.models.unit.getAll();
    const heads = units.filter((v) => v.heads.includes(user.userId));
    const members = units.filter((v) => v.members.includes(user.userId));
    const all = [...new Set([...heads, ...members])];

    user.units = {
      heads: heads.map((v) => v.id),
      members: members.map((v) => v.id),
      all: all.map((v) => v.id),
    };

    return user;
  }

  /**
   * Block by user ID.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async block(id, initiator) {
    if (await this.isUserUpdated(id, { isActive: false }, initiator)) {
      await this.logoutByUserId(id);
      return true;
    }

    return false;
  }

  /**
   * Unblock by user ID.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async unblock(id, initiator) {
    if (await this.isUserUpdated(id, { isActive: true }, initiator)) {
      await this.logoutByUserId(id);
      return true;
    }

    return false;
  }

  /**
   * Set admin by user ID.
   * @param {number} id ID.
   * @param {object} currentUser Current user.
   * @param {boolean} isCurrentAuthClient Is current client.
   * @returns {Promise<boolean>}
   */
  async setAdmin(id, currentUser, isCurrentAuthClient = false) {
    const { clientId } = global.config.auth;
    const roleName = isCurrentAuthClient ? `admin-${clientId}` : 'admin';

    const user = await this.idApiClient.findUserById(id);
    if (!user || typeof user.role === 'undefined') {
      return false;
    }

    const isTestUser = this.testUserChecker.isTestUser(user);

    const { allowSetAdminTestUser = false } = this.config?.user || {};

    if (isTestUser && !allowSetAdminTestUser) {
      global.log.save('set-admin|attempt-to-set-admin-role-to-test-user', { testUserId: id, initiatorUserId: currentUser.userId });
      throw new ForbiddenError('Assigning the administrator role to test users is prohibited');
    }

    let roles = user.role.split(';');
    if (roles.some((v) => v === roleName)) {
      return true;
    }

    roles.push(roleName);
    const preparedRoles = roles.join(';');

    if (await this.isUserUpdated(id, { role: preparedRoles })) {
      await this.logoutByUserId(id);

      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'added-to-admin',
        user: user,
      });

      return true;
    }

    return false;
  }

  /**
   * Unset admin by user ID.
   * @param {number} id ID.
   * @param {object} currentUser Current user.
   * @param {boolean} isCurrentAuthClient Is current client.
   * @returns {Promise<boolean>}
   */
  async unsetAdmin(id, currentUser, isCurrentAuthClient = false) {
    const { clientId } = global.config.auth;
    const roleName = isCurrentAuthClient ? `admin-${clientId}` : 'admin';

    const user = await this.idApiClient.findUserById(id);
    if (!user || typeof user.role === 'undefined') {
      return false;
    }

    let roles = user.role.split(';');
    if (!roles.some((v) => v === roleName)) {
      return true;
    }

    roles = _.pull(roles, roleName);
    const preparedRoles = roles.join(';');

    if (await this.isUserUpdated(id, { role: preparedRoles })) {
      await this.logoutByUserId(id);

      await global.models.accessHistory.save({
        currentUser: currentUser,
        operationType: 'deleted-from-admin',
        user: user,
      });

      return true;
    }

    return false;
  }

  /**
   * Delete user.
   * @param {string} userId User ID.
   * @returns {Promise<boolean>}
   */
  async deleteUser(userId, ipn) {
    // Check the user for their IPN to make sure that the correct account is being deleted.
    const existingUser = await this.idApiClient.findUserById(userId);
    if (existingUser?.ipn !== ipn) {
      global.log.save('delete-user-ipn-mismatch', { userId, ipn });
      return false;
    }

    const response = await this.idApiClient.deleteUser(userId);

    return response?.success || false;
  }

  /**
   * Update by user ID.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async updateByUserId(id, data) {
    return this.isUserUpdated(id, data);
  }

  /**
   * Update the user in id-api.
   * @private
   * @param {string} id User ID.
   * @param {object} data Data to update.
   * @param {object} [initiator] Update initiator.
   * @returns {Promise<boolean>} `false` when id-api rejected the update; network failures and timeouts are thrown.
   */
  private async isUserUpdated(id, data, initiator?) {
    try {
      await this.idApiClient.updateUserById(id, data, initiator);
      return true;
    } catch (error) {
      if (error instanceof IdApiError && error.code === ERROR_CODE_HTTP) {
        global.log.save('user-update-rejected-by-id-api', { id, status: error.status, error: error.message }, 'error');
        return false;
      }
      throw error;
    }
  }

  /**
   * Logout by user ID. An error response of id-api is logged and ignored (the user is already changed
   * when this is called), network failures and timeouts are thrown.
   * @private
   * @param {string} id ID.
   * @returns {Promise<object>}
   */
  private async logoutByUserId(id) {
    try {
      return await this.idApiClient.logoutByUserId(id);
    } catch (error) {
      if (error instanceof IdApiError && error.code === ERROR_CODE_HTTP) {
        global.log.save('id-request-logout-by-user-id-error', { id, status: error.status, error: error.message }, 'error');
        return error.body;
      }
      throw error;
    }
  }

  /**
   * Send message to all users.
   * @param {object} messageBody Message body.
   */
  async sendMessageToAllUsers(messageBody) {
    let response;
    try {
      response = await this.notifierService.sendMessageToAll(messageBody);
    } catch (error) {
      global.log.save('send-message-to-all-user-notify-error', error.message);
      throw error;
    }
    if (response && response.createdMessageId && Number.isInteger(response.createdMessageId)) {
      return true;
    }

    return false;
  }

  /**
   * Send message to all users.
   * @param {number} start Start from message.
   * @param {number} count
   */
  async getMessagesForAllUsers(start, count) {
    let response;
    try {
      response = await this.notifierService.getMessagesForAllUsers(start, count);
    } catch (error) {
      global.log.save('get-messages-for-all-users-notify-error', error.message);
      throw error;
    }
    return response;
  }

  /**
   * Delete message to all users.
   * @param {number} messageId Message ID.
   */
  async deleteMessageForAllUsers(messageId) {
    let response;
    try {
      response = await this.notifierService.deleteMessagesForAllUsers(messageId);
    } catch (error) {
      global.log.save('delete-message-for-all-users-notify-error', error.message);
      throw error;
    }
    return response;
  }

  /**
   * Enforce user to set 2FA on the next login.
   * @param {string} userId User ID.
   * @returns {object} Operation result.
   */
  async enforce2fa(userId) {
    try {
      const user = await this.idApiClient.findUserById(userId);
      if (!user) {
        return { error: 'User not found' };
      }
      if (user && user.useTwoFactorAuth) {
        return { error: '2FA is already enabled for this user' };
      }

      await this.idApiClient.updateUserById(userId, { useTwoFactorAuth: true });

      return { success: true };
    } catch (error) {
      global.log.save('enforce-totp-error', { error: error.message, stack: error.stack, userId });
      return { error: 'Error enabling 2FA for this user' };
    }
  }

  /**
   * Disable 2FA for the user.
   * @param {string} userId User ID.
   * @returns {object} Operation result.
   */
  async disable2fa(userId) {
    try {
      const user = await this.idApiClient.findUserById(userId);
      if (!user) {
        return { error: 'User not found' };
      }
      if (user && !user.useTwoFactorAuth) {
        return { error: '2FA is already disabled for this user' };
      }

      await this.idApiClient.updateUserById(userId, { useTwoFactorAuth: false, twoFactorType: null });

      return { success: true };
    } catch (error) {
      global.log.save('disable-totp-error', { error: error.message, stack: error.stack, userId });
      return { error: 'Error disabling 2FA for this user' };
    }
  }

  setUserPassword({ id, password }) {
    return this.idApiClient.setUserPassword({ id, password });
  }

  async createLocalUser(options) {
    return this.idApiClient.createLocalUser(options);
  }
}
