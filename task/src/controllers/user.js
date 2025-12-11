
const _ = require('lodash');
const crypto = require('crypto');
const Controller = require('./controller');
const UnitModel = require('../models/unit');
const Auth = require('../services/auth');

class UserController extends Controller {
  /**
   * User controller constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Singleton.
    if (!UserController.singleton) {
      // Set params.
      super(config);
      this.unitModel = new UnitModel();
      this.auth = new Auth().provider;

      // Define singleton.
      UserController.singleton = this;
    }
    return UserController.singleton;
  }

  /**
   * Search.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async search(req, res) {
    // Define params.
    let { userIds = [], unitIds = [], ids = [], codes = [], code, search } = req.body;
    if (code) {
      codes.push(code);
    }
    if (ids.length > 0) {
      unitIds = [...unitIds, ...ids];
    }

    // Get units.
    let units;
    try {
      const allUnits = await this.unitModel.getAll();
      units = allUnits.filter(v => unitIds.includes(v.id));
    } catch (error) {
      return this.responseError(res, error);
    }

    // Define units heads and members.
    const unitsHeads = units.reduce((t, v) => [...t, ...v.heads], []);
    const unitsMembers = units.reduce((t, v) => [...t, ...v.members], []);

    // Get all needed users IDs list.
    const allNeededUsersIds = [...new Set([...userIds, ...unitsHeads, ...unitsMembers])];

    // Define all needed users data.
    const withPrivateProps = false;
    let allNeededUsers = await this.auth.getUsersByIds(allNeededUsersIds, withPrivateProps);

    for (const code of codes) {
      const user = await this.auth.getUserByCode(code);
      if (user) {
        allNeededUsers.push(await this.auth.getUserByCode(code));
      }
    }
    if (search) {
      const foundUsers = await this.auth.searchUsers(search);
      if (Array.isArray(foundUsers) && foundUsers.length > 0) {
        allNeededUsers = [...allNeededUsers, ...(foundUsers).map(v => ({ name: v.name, userId: v.userId }))];
      }
    }
    allNeededUsers = _.uniqBy(allNeededUsers, 'userId');

    // Prepare users data to response.
    const preparedUsersData = (allNeededUsers || []).map(v => ({
      userId: v.userId,
      name: v.name,
      companyName: v.companyName,
      companyUnit: v.companyUnit,
      isLegal: v.isLegal,
      isIndividualEntrepreneur: v.isIndividualEntrepreneur,
      email: v.email,
      phone: v.phone,
      avaUrl: v.avaUrl
    }));

    this.responseData(res, preparedUsersData);
  }

  /**
   * Update info.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async updateInfo(req, res) {
    // Define params.
    const {
      gender,
      birthday,
      phone,
      email,
      isIndividualEntrepreneur,
      legalEntityDateRegistration,
      address,
      addressStruct,
      passportSeries,
      passportNumber,
      passportIssueDate,
      passportIssuedBy,
      foreignersDocumentSeries,
      foreignersDocumentNumber,
      foreignersDocumentIssueDate,
      foreignersDocumentExpireDate,
      foreignersDocumentIssuedBy,
      foreignersDocumentType,
      idCardNumber,
      idCardIssueDate,
      idCardIssuedBy,
      idCardExpiryDate,
      isPrivateHouse
    } = req.body;
    const updateOptions = {
      gender,
      birthday,
      phone,
      email,
      isIndividualEntrepreneur,
      legalEntityDateRegistration,
      address,
      addressStruct,
      passportSeries,
      passportNumber,
      passportIssueDate,
      passportIssuedBy,
      foreignersDocumentSeries,
      foreignersDocumentNumber,
      foreignersDocumentIssueDate,
      foreignersDocumentExpireDate,
      foreignersDocumentIssuedBy,
      foreignersDocumentType,
      idCardNumber,
      idCardIssueDate,
      idCardIssuedBy,
      idCardExpiryDate,
      isPrivateHouse
    };
    const userId = this.getRequestUserId(req);
    const accessToken = this.getRequestUserAccessToken(req);
    const userInfo = this.getRequestUserInfo(req);
    const existingPhone = userInfo.phone;
    const existingEmail = userInfo.email;

    // Check gender.
    const allowedGenders = global.config.user?.allowedGenders || ['male', 'female'];
    if (gender && !allowedGenders.includes(gender)) {
      return this.responseError(res, `Can't set gender ${gender}. Allowed list: ${allowedGenders.map(v => `"${v}"`).join(', ')}.`);
    }

    // Check phone.
    if (existingPhone === phone) {
      // Do not update phone if the same as before.
      delete updateOptions.phone;
    } else {
      if (!this.config.user.allowSetUnconfirmedPhone && phone) {
        return this.responseError(res, 'Can\'t set unconfirmed phone. Verify it first.');
      }
      // Set validation indicator to `false` if phone should be changed.
      updateOptions.valid = { phone: false };
      updateOptions.isValidPhone = 'false';
    }

    // Check email.
    if (existingEmail?.trim()?.toLowerCase() === email?.trim()?.toLowerCase()) {
      // Do not update email if the same as before.
      delete updateOptions.email;
    } else {
      if (!this.config.user.allowSetUnconfirmedEmail && email) {
        return this.responseError(res, 'Can\'t set unconfirmed email. Verify it first.');
      }
      // Set validation indicator to `false` if email should be changed.
      updateOptions.valid = { email: false };
      updateOptions.isValidEmail = 'false';
    }

    // Check if legal person try to change individual entrepreneur indicator to "true".
    const isIndividualEntrepreneurTurningOnRequested = [true, 'true', 1].includes(
      isIndividualEntrepreneur
    );
    const isLegalRequestedUser = userInfo.isLegal;
    if (isIndividualEntrepreneurTurningOnRequested && isLegalRequestedUser) {
      return this.responseError(
        res,
        'Legal person can\'t turn on individual entrepreneur indicator.'
      );
    }

    // Update.
    let isUpdated;
    try {
      isUpdated = await this.auth.updateUser(userId, accessToken, updateOptions);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!isUpdated) {
      return this.responseError(res, 'Can\'t update user info.');
    }

    // Clear user info cache.
    if (global.redisClient) {
      try {
        const sha1AccessToken = this.getSha1Hash(accessToken);
        await global.redisClient.delete(`token.${sha1AccessToken}`);
      } catch (error) {
        log.save('user-controller|update-info|clear-user-info-from-cache-error', { error: error && error.message }, 'error');
      }
    }

    this.responseThatAccepted(res);
  }

  /**
   * Get two factor auth.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async getTwoFactorAuth(req, res) {
    // Define params.
    const userInfo = this.getRequestUserInfo(req);
    const { useTwoFactorAuth, twoFactorType } = userInfo || {};

    this.responseData(res, { useTwoFactorAuth: !!useTwoFactorAuth, twoFactorType });
  }

  /**
   * Set two factor auth.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async setTwoFactorAuth(req, res) {
    // Define params.
    const { useTwoFactorAuth, twoFactorType } = req.body;
    const updateOptions = {
      useTwoFactorAuth: useTwoFactorAuth ? 'true' : 'false',
      twoFactorType,
    };
    const userId = this.getRequestUserId(req);
    const accessToken = this.getRequestUserAccessToken(req);

    // Update.
    let isUpdated;
    try {
      isUpdated = await this.auth.updateUser(userId, accessToken, updateOptions);
    } catch (error) {
      return this.responseError(res, error);
    }
    if (!isUpdated) {
      return this.responseError(res, 'Can\'t set two factor auth.');
    }

    this.responseThatAccepted(res);
  }

  /**
   * Get by ID.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async findById(req, res) {
    // Define params.
    const userId = req.params.id;

    // Search users.
    let users;
    try {
      users = await this.auth.getUsersByIds(userId);
    } catch (err) {
      return this.responseError(res, err);
    }

    this.responseData(res, { user: users && users[0] });
  }

  /**
   * Check if phone exists.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async isPhoneExists(req, res) {
    const userInfo = this.getRequestUserInfo(req);

    if (!userInfo || !userInfo.valid || typeof userInfo.valid.phone === 'undefined') {
      log.save('userinfo-property-phone', 'Phone status does\'t exist.', 'error');
      return this.responseError(res, 'Phone status does\'t exist.');
    }

    this.responseData(res, { exists: userInfo.valid.phone });
  }

  /**
   * Check if phone already used.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async isPhoneAlreadyUsed(req, res) {
    // Define params.
    const { phone } = req.query;

    // Check phone existing info.
    let phoneExistingInfo;
    try {
      phoneExistingInfo = await this.auth.checkPhoneExist(phone);
    } catch {
      return this.responseError(res, 'Can\'t check phone existing info.');
    }

    // Define and response phone existing info.
    const { isExist, isConfirmed } = phoneExistingInfo;
    this.responseData(res, { isExist, isConfirmed });
  }

  /**
   * Send sms for phone verification.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async sendSmsForPhoneVerification(req, res) {
    // Define params.
    const newPhone = req.body.phone;
    const userInfo = this.getRequestUserInfo(req);
    const existingPhone = userInfo.phone;
    const phone = newPhone || existingPhone;

    // Check phone.
    if (!phone) {
      log.save('userinfo-property-phone', { newPhone, existingPhone }, 'error');
      return this.responseError(res, 'Phone does\'t exist.');
    }

    // Send SMS.
    try {
      await this.auth.sendSms(phone);
    } catch (error) {
      log.save('can-not-send-sms', { error: error && error.message }, 'error');
      return this.responseError(res, 'Can\'t send sms.');
    }

    this.responseThatAccepted(res);
  }

  /**
   * Verify phone.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async verifyPhone(req, res) {
    // Define params.
    const newPhone = req.body.phone;
    const userInfo = this.getRequestUserInfo(req);
    const existingPhone = userInfo.phone;
    const phone = newPhone || existingPhone;
    const code = req.body.code;
    const accessToken = this.getRequestUserAccessToken(req);

    // Check phone.
    if (!phone) {
      log.save('phone-verification-wrong-params', { newPhone, existingPhone }, 'error');
      return this.responseError(res, 'Phone does\'t exist.');
    }

    // Try to verify phone.
    let response;
    try {
      response = await this.auth.verifyPhoneAndSet(phone, code, accessToken);
    } catch {
      log.save('phone-verification-exception', { response, phone, code, accessToken }, 'error');
      return this.responseError(res, 'Can\'t verity phone.');
    }

    // Check response.
    if (!response) {
      log.save('phone-verification-without-court-id-response', { phone, code }, 'error');
      return this.responseError(res, 'Court ID response not exist.');
    }
    if (response.error) {
      log.save('phone-verification-error', { phone, code, error: response.error }, 'error');
      return this.responseError(res, response.error && response.error.message);
    }
    if (!response.data) {
      log.save('phone-verification-without-data', { phone, code }, 'error');
      return this.responseError(res, 'Court ID response do not contain data.');
    }

    // Clear user phone info cache.
    if (global.redisClient) {
      try {
        const sha1AccessToken = this.getSha1Hash(accessToken);
        await global.redisClient.delete(`token.${sha1AccessToken}`);
      } catch (error) {
        log.save('user-controller|verify-phone|clear-user-phone-from-cache-error', { error: error && error.message }, 'error');
      }
    }

    return this.responseData(res, response.data);
  }

  /**
   * Change email.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async changeEmail(req, res) {
    // Define params.
    const email = req.body.email;

    // Send Email.
    try {
      await this.auth.changeEmail(email);
    } catch (error) {
      log.save('can-not-send-email-code', { error: error && error.message }, 'error');
      return this.responseError(res, 'Can\'t send email code.');
    }

    this.responseThatAccepted(res);
  }

  /**
   * Confirm change email.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async confirmChangeEmail(req, res) {
    // Define params.
    const email = req.body.email;
    const code = req.body.code;
    const accessToken = this.getRequestUserAccessToken(req);

    // Confirm new email.
    try {
      await this.auth.confirmChangeEmail(email, code, accessToken);
    } catch (error) {
      log.save('can-not-confirm-change-email', { error: error && error.message }, 'error');
      return this.responseError(res, 'Can\'t confirm change email.');
    }

    // Clear user email info cache.
    if (global.redisClient) {
      try {
        const sha1AccessToken = this.getSha1Hash(accessToken);
        await global.redisClient.delete(`token.${sha1AccessToken}`);
      } catch (error) {
        log.save('user-controller|confirm-change-email|clear-user-email-from-cache-error', { error: error && error.message }, 'error');
      }
    }

    this.responseThatAccepted(res);
  }

  /**
   * @param {e.request} req
   * @param {e.response} res
   * @return {Promise<void>}
   */
  async checkEmailConfirmationCode(req, res) {
    // Define params.
    const email = req.body.email;
    const code = req.body.code;
    const accessToken = this.getRequestUserAccessToken(req);

    // Confirm email confirmation code.
    try {
      await this.auth.checkEmailConfirmationCode(email, code, accessToken);
    } catch (error) {
      log.save('user-controller|check-email-confirmation-code|error', { error: error && error.message }, 'error');
      return this.responseError(res, 'Can\'t check email confirmaiton code.');
    }

    this.responseThatAccepted(res);
  }

  /**
   * Check email.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async checkEmail(req, res) {
    // Define params.
    const email = req.body.email;

    // Check existence.
    let isExist;
    try {
      isExist = await this.auth.checkEmail(email);
    } catch (error) {
      log.save('can-not-define-email-existance', { error: error && error.message, email }, 'error');
      return this.responseError(res, 'Can\'t define email existence status.');
    }

    this.responseData(res, { isExist });
  }

  /**
   * Generate and return sha1 hash.
   * @param {string} data.
   * @return {string}
   */
  getSha1Hash(data) {
    return crypto.createHash('sha1').update(data).digest('hex');
  }
}

module.exports = UserController;
