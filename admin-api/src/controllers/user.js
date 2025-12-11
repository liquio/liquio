const { matchedData } = require('express-validator');

const Controller = require('./controller');
const UserBusiness = require('../businesses/user');
const {
  UNIT_ADMIN_UNIT,
  SECURITY_ADMIN_UNIT,
  SYSTEM_ADMIN_UNIT,
  READONLY_SECURITY_ADMIN_UNIT,
  READONLY_SYSTEM_ADMIN_UNIT,
} = require('../constants/unit');

/**
 * User controller.
 */
class UserController extends Controller {
  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserController.singleton) {
      super(config);
      this.userBusiness = new UserBusiness(config);
      UserController.singleton = this;
    }
    return UserController.singleton;
  }

  /**
   * Search users.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async search(req, res) {
    const bodyData = matchedData(req, { locations: ['body'] });
    const { brief_info: briefInfo } = matchedData(req, { locations: ['query'] });
    const { search, ids, code } = bodyData;
    let users;

    const unitIds = this.getRequestUserUnitIds(req)?.all || [];

    const onlySystemAdmin =
      (unitIds.includes(SYSTEM_ADMIN_UNIT) || unitIds.includes(READONLY_SYSTEM_ADMIN_UNIT)) &&
      !unitIds.includes(SECURITY_ADMIN_UNIT) &&
      !unitIds.includes(READONLY_SECURITY_ADMIN_UNIT) &&
      !unitIds.includes(UNIT_ADMIN_UNIT);
    if (onlySystemAdmin && !briefInfo) {
      return this.responseError(res, 'System admin can search users only with brief param.', 401);
    }

    try {
      users = await this.userBusiness.search({ search, ids, code, briefInfo });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, users);
  }

  /**
   * Get users.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getUsers(req, res) {
    const { id, email, phone, search, ipn, role, offset = 0, limit = 20 } = matchedData(req, { locations: ['query'] });
    let users;

    try {
      users = await this.userBusiness.getUsers({ id, email, phone, search, ipn, role, offset, limit });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, users, true);
  }

  /**
   * Find user by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;
    let user;

    try {
      user = await this.userBusiness.findByUserId(id);
      if (!user) {
        return this.responseError(res, 'Not found.', 404);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, user);
  }

  /**
   * Update user by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async update(req, res) {
    try {
      const { id } = matchedData(req, { locations: ['params'] });
      const { role, isActive } = matchedData(req, { locations: ['body'] });
      const data = { role, isActive };

      const saved = await this.userBusiness.updateByUserId(id, data);
      if (saved === true) {
        return this.responseThatAccepted(res);
      }

      await log.save('user-updated-user', {
        user: this.getRequestUserBaseInfo(req),
        data: data,
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseError(res, 'Data has not been saved.');
  }

  /**
   * Block user by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async block(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;

    try {
      const blocked = await this.userBusiness.block(id, this.getRequestUserBaseInfo(req));
      if (blocked === true) {
        return this.responseThatAccepted(res);
      }

      await log.save('user-blocked-user', {
        user: this.getRequestUserBaseInfo(req),
        data: { id },
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseError(res, 'User has not been blocked.');
  }

  /**
   * Unblock user by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async unblock(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const id = paramsData.id;

    try {
      const unblocked = await this.userBusiness.unblock(id, this.getRequestUserBaseInfo(req));
      if (unblocked === true) {
        return this.responseThatAccepted(res);
      }

      await log.save('user-unblocked-user', {
        user: this.getRequestUserBaseInfo(req),
        data: { id },
      });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseError(res, 'User has not been blocked.');
  }

  /**
   * Set admin user by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setAdmin(req, res) {
    // Define params.
    const { isCurrentAuthClientDefault } = global.config.auth;
    const paramsData = matchedData(req, { locations: ['params', 'body'] });
    const { id, isCurrentAuthClient = isCurrentAuthClientDefault } = paramsData;

    // Try change admin role.
    try {
      // Set admin.
      const currentUser = this.getRequestUserBaseInfo(req);
      const enabled = await this.userBusiness.setAdmin(id, currentUser, isCurrentAuthClient);
      if (enabled === true) {
        return this.responseThatAccepted(res);
      }

      // Log.
      await log.save('user-enabled-role-admin', {
        user: currentUser,
        data: { id, isCurrentAuthClient },
      });
    } catch (error) {
      // Response error.
      return this.responseError(res, error);
    }

    // Response role not changed.
    this.responseError(res, 'User has not been enabled role admin.');
  }

  /**
   * Unset admin user by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async unsetAdmin(req, res) {
    // Define params.
    const { isCurrentAuthClientDefault } = global.config.auth;
    const paramsData = matchedData(req, { locations: ['params', 'body'] });
    const { id, isCurrentAuthClient = isCurrentAuthClientDefault } = paramsData;

    // Try change admin role.
    try {
      // Unset admin.
      const currentUser = this.getRequestUserBaseInfo(req);
      const disabled = await this.userBusiness.unsetAdmin(id, currentUser, isCurrentAuthClient);
      if (disabled === true) {
        return this.responseThatAccepted(res);
      }

      // Log.
      await log.save('user-disabled-role-admin', {
        user: currentUser,
        data: { id, isCurrentAuthClient },
      });
    } catch (error) {
      // Response error.
      return this.responseError(res, error);
    }

    // Response role not changed.
    this.responseError(res, 'User has not been disabled role admin.');
  }

  /**
   * Delete user by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteUser(req, res) {
    const paramsData = matchedData(req, { locations: ['params'] });
    const { ipn } = matchedData(req, { locations: ['body'] });
    const id = paramsData.id;

    try {
      const deleted = await this.userBusiness.deleteUser(id, ipn, this.getRequestUserBaseInfo(req));
      if (deleted === true) {
        return this.responseThatAccepted(res);
      }

      await log.save('user-deleted-user', { user: this.getRequestUserBaseInfo(req), data: { id, ipn } });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseError(res, 'User has not been deleted.');
  }

  /***
   * Send message to all users.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async sendMessageToAllUsers(req, res) {
    const body = matchedData(req, { locations: ['body'] });
    log.save('send-message-to-all', { body });

    let result;
    try {
      result = await this.userBusiness.sendMessageToAllUsers(body);
      if (result === true) {
        return this.responseThatAccepted(res);
      }
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseError(res, 'Can not send message to all users.');
  }

  /***
   * Get messages for all users.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getMessagesForAllUsers(req, res) {
    const { start, count } = matchedData(req, { locations: ['query'] });

    let result;
    try {
      result = await this.userBusiness.getMessagesForAllUsers(start, count);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result, true);
  }

  /***
   * Delete message for all users.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async deleteMessageForAllUsers(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });

    let result;
    try {
      result = await this.userBusiness.deleteMessageForAllUsers(id);
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result, true);
  }

  /**
   * Set new password for user.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setPassword(req, res) {
    const { id, password } = matchedData(req, { locations: ['params', 'body'] });

    let result;
    try {
      result = await this.userBusiness.setUserPassword({ id, password });
    } catch (error) {
      return this.responseError(res, error);
    }

    this.responseData(res, result, true);
  }

  async createLocalUser(req, res) {
    const body = matchedData(req, { locations: ['body'] });

    let result;
    try {
      result = await this.userBusiness.createLocalUser(body);
    } catch (error) {
      try {
        const message = JSON.parse(error.message);
        return this.responseError(res, message.error, 400);
      } catch {
        return this.responseError(res, error);
      }
    }

    this.responseData(res, result, true);
  }

  /**
   * Mark user account to setup 2FA on next login.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async enforce2fa(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
      const result = await this.userBusiness.enforce2fa(id);
      return this.responseData(res, result);
    } catch (error) {
      return this.responseError(res, error);
    }
  }

  /**
   * Disable TOTP 2FA for user.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async disable2fa(req, res) {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
      const result = await this.userBusiness.disable2fa(id);
      return this.responseData(res, result);
    } catch (error) {
      return this.responseError(res, error);
    }
  }
}

module.exports = UserController;
