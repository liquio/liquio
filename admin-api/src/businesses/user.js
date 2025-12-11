const _ = require('lodash');

const AuthService = require('../services/auth');
const NotifierService = require('../services/notifier');
const TestUserChecker = require('../lib/test_user_checker');
const { ForbiddenError } = require('../lib/errors');

/**
 * User business.
 */
class UserBusiness {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserBusiness.singleton) {
      this.config = config;
      this.authService = new AuthService(config.auth);
      this.notifierService = new NotifierService(config.notifier);
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
      users.push(...(await this.authService.searchUsers(search)));
    }
    if (ids) {
      users.push(...(await this.authService.getUsersByIds(ids, false, briefInfo)));
    }
    if (code) {
      users.push(await this.authService.findUserByCode(code));
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
    const { response, body: users } = await this.authService.getUsers({
      id,
      email,
      phone,
      search,
      ipn,
      role,
      offset,
      limit,
    });

    const units = await models.unit.getAll();

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
      data.pagination.total = parseInt(response.headers.total);
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
    const user = await this.authService.findByUserId(id);

    const units = await models.unit.getAll();
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
    const response = await this.authService.updateByUserId(id, { isActive: false }, initiator);
    if (response === 'ok') {
      await this.authService.logoutByUserId(id);
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
    const response = await this.authService.updateByUserId(id, { isActive: true }, initiator);
    if (response === 'ok') {
      await this.authService.logoutByUserId(id);
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

    const user = await this.authService.findByUserId(id);
    if (!user || typeof user.role === 'undefined') {
      return false;
    }

    const isTestUser = this.testUserChecker.isTestUser(user);

    const { allowSetAdminTestUser = false } = this.config?.user || {};

    if (isTestUser && !allowSetAdminTestUser) {
      log.save('set-admin|attempt-to-set-admin-role-to-test-user', { testUserId: id, initiatorUserId: currentUser.userId });
      throw new ForbiddenError('Assigning the administrator role to test users is prohibited');
    }

    let roles = user.role.split(';');
    if (roles.some((v) => v === roleName)) {
      return true;
    }

    roles.push(roleName);
    const preparedRoles = roles.join(';');

    const response = await this.authService.updateByUserId(id, { role: preparedRoles });
    if (response === 'ok') {
      await this.authService.logoutByUserId(id);

      await models.accessHistory.save({
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

    const user = await this.authService.findByUserId(id);
    if (!user || typeof user.role === 'undefined') {
      return false;
    }

    let roles = user.role.split(';');
    if (!roles.some((v) => v === roleName)) {
      return true;
    }

    roles = _.pull(roles, roleName);
    const preparedRoles = roles.join(';');

    const response = await this.authService.updateByUserId(id, { role: preparedRoles });
    if (response === 'ok') {
      await this.authService.logoutByUserId(id);

      await models.accessHistory.save({
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
    const existingUser = await this.authService.findByUserId(userId);
    if (existingUser?.ipn !== ipn) {
      log.save('delete-user-ipn-mismatch', { userId, ipn });
      return false;
    }

    const response = await this.authService.deleteUser(userId);

    return response?.success || false;
  }

  /**
   * Update by user ID.
   * @param {number} id ID.
   * @returns {Promise<boolean>}
   */
  async updateByUserId(id, data) {
    const response = await this.authService.updateByUserId(id, data);
    if (response === 'ok') {
      return true;
    }

    return false;
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
      log.save('send-message-to-all-user-notify-error', error.message);
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
      log.save('get-messages-for-all-users-notify-error', error.message);
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
      log.save('delete-message-for-all-users-notify-error', error.message);
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
      const user = await this.authService.findByUserId(userId);
      if (!user) {
        return { error: 'User not found' };
      }
      if (user && user.useTwoFactorAuth) {
        return { error: '2FA is already enabled for this user' };
      }

      await this.authService.updateByUserId(userId, { useTwoFactorAuth: true });

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
      const user = await this.authService.findByUserId(userId);
      if (!user) {
        return { error: 'User not found' };
      }
      if (user && !user.useTwoFactorAuth) {
        return { error: '2FA is already disabled for this user' };
      }

      await this.authService.updateByUserId(userId, { useTwoFactorAuth: false, twoFactorType: null });

      return { success: true };
    } catch (error) {
      global.log.save('disable-totp-error', { error: error.message, stack: error.stack, userId });
      return { error: 'Error disabling 2FA for this user' };
    }
  }

  setUserPassword({ id, password }) {
    return this.authService.setUserPassword({ id, password });
  }

  async createLocalUser(options) {
    return this.authService.createLocalUser(options);
  }
}

module.exports = UserBusiness;
