import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { matchedData, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import Sequelize, { Op, WhereOptions } from 'sequelize';

import { DEFAULT_COOKIE_DOMAIN } from '../config';
import { calculateUserCode } from '../lib/calculate_user_code';
import { avatarByGender, delay, generateRandomBase36, validateEmail } from '../lib/helpers';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { saveSession } from '../middleware/session';
import { UserAttributes } from '../models';
import { Express, NextFunction, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

const DEFAULT_LIMIT = 10;
const PREPARE_USER_PROVIDER = 'eds';
const HASHING_SALT_ROUNDS = 10;
const DEFAULT_JWT_EXPIRATION_TIME = 60;

export class UserController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'user');
  }

  protected registerRoutes() {
    // Public methods
    this.router.get(
      '/subscribe',
      [query('email').optional().isString(), query('phone').optional().isString(), this.handleValidation.bind(this)],
      this.promoSubscribe.bind(this),
    );
    this.router.get('/user/info/email/send', [query('email').isString(), this.handleValidation.bind(this)], this.sendToNewEmailCode.bind(this));

    // User methods
    this.router.get(
      '/logoff/:service',
      [query('forward').default('/').isString(), this.handleValidation.bind(this)],
      this.auth.authorise(),
      this.logOff.bind(this),
    );
    this.router.get('/user/info/setValidPhone', this.auth.authorise(), this.setValidPhone.bind(this));
    this.router.get(
      '/removeConfirmCode',
      [query('code').exists().isString(), this.handleValidation.bind(this)],
      this.auth.authorise(),
      this.clearConfCode.bind(this),
    );
    this.router.get(
      '/user/info/email/set',
      [
        query('email').exists().isString(),
        query('code_email').exists().isString(),
        query('code_phone').optional().isString(),
        this.handleValidation.bind(this),
      ],
      this.auth.authorise(),
      this.setToNewEmail.bind(this),
    );
    this.router.get(
      '/user/info/email/check_email_confirmation_code',
      [query('email').exists().isString(), query('code_email').exists().isString(), this.handleValidation.bind(this)],
      this.auth.authorise(),
      this.checkEmailConfirmationCode.bind(this),
    );
    this.router.get('/user/info', this.auth.authorise(), this.getUserInfo.bind(this));
    this.router.post('/user/info', this.auth.authorise(), this.updateUserInfo.bind(this));
    this.router.get('/user/jwt', this.auth.authorise(), this.getUserJwt.bind(this));
    this.router.get(
      '/user/info/phone/check_phone_confirmation_code',
      [query('phone').exists().isString(), query('code_phone').exists().isString(), this.handleValidation.bind(this)],
      this.auth.authorise(),
      this.checkPhoneConfirmationCode.bind(this),
    );
    this.router.post('/user/logout_other_sessions', this.auth.authorise(), this.logoutOtherSessions.bind(this));

    // Admin methods
    this.router.get(
      '/user/info/email/check',
      [query('email').isString(), this.handleValidation.bind(this)],
      this.auth.basic(),
      this.checkEmail.bind(this),
    );
    this.router.get(
      '/user',
      [
        query('offset').isNumeric().default(0),
        query('limit').isNumeric().default(20),
        query('id').optional().isString(),
        query('email').optional().isString(),
        query('phone').optional().isString(),
        query('ipn').optional().isString(),
        query('role').optional().isString(),
        query('search').optional().isString(),
        this.handleValidation.bind(this),
      ],
      this.auth.basic(),
      this.getUsers.bind(this),
    );
    this.router.post('/user/create_local', this.auth.basic(), this.createUserLocal.bind(this));
    this.router.get('/user/:id', this.auth.basic(), this.findUserById.bind(this));
    this.router.delete('/user/:id', this.auth.basic(), this.deleteUser.bind(this));
    this.router.post('/user/:id/logout', this.auth.basic(), this.logoutByUserId.bind(this));
    this.router.get('/user/info/phone', this.auth.basic(), this.getUserInfoByPhone.bind(this));
    this.router.post('/user/info/id', this.auth.basic(), this.getUsersInfoById.bind(this));
    this.router.post('/user/info/ipn', this.auth.basic(), this.getUsersInfoByIpn.bind(this));
    this.router.post('/user/info/edrpou', this.auth.basic(), this.getUsersInfoByEdrpou.bind(this));
    this.router.post('/user/info/search', this.auth.basic(), this.searchUsers.bind(this));
    this.router.delete('/user', this.auth.basic(), this.deleteUser.bind(this));
    this.router.put('/user/info/onboarding', this.auth.basic(), this.updateUserOnboarding.bind(this));
    this.router.put('/user/info/:id', this.auth.basic(), this.updateUserInfoById.bind(this));
    this.router.post('/user/prepare', this.auth.basic(), this.prepareUser.bind(this));

    // Password management methods
    this.router.post('/user/password/set', this.auth.basic(), this.setPassword.bind(this));
    this.router.post('/user/password/forgot', this.checkForgotPasswordConfig.bind(this), this.forgotPassword.bind(this));
    this.router.post('/user/password/reset', this.checkForgotPasswordConfig.bind(this), this.passwordReset.bind(this));
  }

  /**
   * Logout other sessions.
   */
  async logoutOtherSessions(req: Request, res: Response): Promise<void> {
    // Define params.
    const userId = req.user && (req.user as any).id;
    const accessToken = req.body.access_token;
    const refreshToken = req.body.refresh_token;
    const destroyAccessTokenWhereQuery = {
      userId,
      accessToken: { [Op.ne]: accessToken },
    };
    const destroyRefreshTokenWhereQuery = {
      userId,
      refreshToken: { [Op.ne]: refreshToken },
    };

    const loginHistoryData = prepareLoginHistoryData(req, {
      actionType: 'logout',
    });
    this.log.save(
      'logout-other-sessions-request',
      {
        userId,
        accessToken,
        refreshToken,
        destroyAccessTokenWhereQuery,
        destroyRefreshTokenWhereQuery,
      },
      'info',
    );

    // Destroy other access tokens.
    if (accessToken) {
      await this.model('accessToken').destroy({
        where: destroyAccessTokenWhereQuery,
      });
    }

    // Destroy other refresh tokens.
    if (refreshToken) {
      await this.model('refreshToken').destroy({
        where: destroyRefreshTokenWhereQuery,
      });
    }

    await this.model('sessions').destroy({ where: { userId: userId } });

    // Save to login_history as logout.
    if (loginHistoryData) {
      await this.model('loginHistory').create(loginHistoryData);
    }

    // Inform that accepted.
    res.status(201).send({ data: { accepted: true } });
  }

  /**
   * Return currently logged in user info.
   */
  async getUserInfo(req: Request, res: Response): Promise<void> {
    const user = await this.service('auth').getUser({ userId: (req.user as any).id });
    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    const { scope = [] } = res.locals.oauth.token ?? {};
    if (!Array.isArray(scope)) {
      res.status(400).send('Invalid scope');
      return;
    }

    // Sanitize user data.
    const responseUser: Record<string, any> = scope.reduce((acc, key: keyof UserAttributes) => Object.assign(acc, { [key]: user[key] }), {});
    if (scope.includes('password')) {
      responseUser.password = !!user.password;
    }

    res.send(responseUser);
  }

  /**
   * Update user info.
   */
  async updateUserInfo(req: Request, res: Response): Promise<void> {
    // Define params.
    const userId = (req.user as any).id;
    const fields = [
      'gender',
      'phone',
      'email',
      'birthday',
      'useTwoFactorAuth',
      'twoFactorType',
      'isIndividualEntrepreneur',
      'legalEntityDateRegistration',
      'address',
      'passport_series',
      'passport_number',
      'passport_issue_date',
      'passport_issued_by',
      'foreigners_document_series',
      'foreigners_document_number',
      'foreigners_document_issue_date',
      'foreigners_document_expire_date',
      'foreigners_document_issued_by',
      'foreigners_document_type',
      'id_card_number',
      'id_card_issue_date',
      'id_card_issued_by',
      'id_card_expiry_date',
      'addressStruct',
      'is_private_house',
    ];

    // Define update query.
    let query: WhereOptions;
    try {
      query = this.service('user').extractUpdateUserInfoParams(req, fields);
    } catch (error: any) {
      this.log.save('update-user-info-error', { userId, error: error.message, stack: error.stack }, 'error');
      res.status(400).send(error.message);
      return;
    }

    try {
      const user: any = await this.service('auth').updateUser({ userId }, query);

      const changedUser = {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        avaUrl: user.avaUrl ?? avatarByGender(user.gender),
      };

      // Update session.
      if (req.session.passport?.user) {
        await saveSession(req, user);
      }

      res.cookie('jwt', JSON.stringify(changedUser), {
        domain: this.config.domain ?? DEFAULT_COOKIE_DOMAIN,
      });
      res.send('ok');
    } catch (error: any) {
      this.log.save('update-user-error', { userId, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error?.message);
    }
  }

  /**
   * Get user info by phone.
   */
  async getUserInfoByPhone(req: Request, res: Response): Promise<void> {
    try {
      const phone = req.query.phone;

      if (!phone) {
        res.status(400).send('Phone is required');
        return;
      }

      const user = await this.service('auth').getUser({ phone });
      res.status(!user ? 404 : 200).send(user);
    } catch (err) {
      res.status(400).send(err);
    }
  }

  /**
   * Get user info by ID.
   */
  async getUsersInfoById(req: Request, res: Response): Promise<void> {
    try {
      let userIds = Array.isArray(req.body.id) ? req.body.id : [req.body.id];
      userIds = userIds.filter((v: any) => this.service('auth').isUserId(v));

      const params: any = {};
      if (req.query.brief_info === 'true') {
        params.attributes = ['userId', 'email', 'phone', 'first_name', 'last_name', 'middle_name', 'ipn'];
      }

      const users = await this.service('auth').getUsersAsync({ userId: { [Op.in]: userIds } }, params);
      res.status(200).send(users);
    } catch (error: any) {
      this.log.save('get-users-info-by-id-error', { userId: req.body.id, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Get user info by IPN.
   */
  async getUsersInfoByIpn(req: Request, res: Response): Promise<void> {
    const ipn = req.body.ipn;
    const ipnCollection = (Array.isArray(ipn) ? ipn : [ipn]).filter((v) => typeof v === 'string' && v.length > 0);

    // Check.
    if (ipnCollection.length === 0) {
      res.status(400).send([]);
      return;
    }

    try {
      const query = {
        [Op.or]: [
          { ipn: { [Op.in]: ipnCollection } },
          { edrpou: { [Op.in]: ipnCollection }, isLegal: true },
          { edrpou: { [Op.in]: ipnCollection }, isIndividualEntrepreneur: true },
        ],
      };

      const users = await this.service('auth').getUsersAsync(query);
      res.status(200).send(users);
    } catch (error: any) {
      this.log.save('get-users-info-by-ipn-error', { ipn: req.body.ipn, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Get user info by EDRPOU.
   */
  async getUsersInfoByEdrpou(req: Request, res: Response): Promise<void> {
    const edrpou = req.body.edrpou;
    const edrpouCollection = (Array.isArray(edrpou) ? edrpou : [edrpou]).filter((v) => typeof v === 'string' && v.length > 0);

    // Check.
    if (edrpouCollection.length === 0) {
      res.status(400).send([]);
      return;
    }

    try {
      const query = { edrpou: { [Op.in]: edrpouCollection } };
      const users = await this.service('auth').getUsersAsync(query);
      res.status(200).send(users);
    } catch (error: any) {
      this.log.save('get-users-info-by-edrpou-error', { edrpou: req.body.edrpou, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Search users.
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      // Define params.
      const searchString = req.body.searchString;
      const [lastName, firstName, middleName] = searchString.split(' ');
      let query: WhereOptions;
      if (typeof lastName !== 'undefined' && typeof firstName !== 'undefined') {
        query = {
          last_name: { [Op.iLike]: `${lastName}%` },
          first_name: { [Op.iLike]: `${firstName}%` },
        };
        if (typeof middleName !== 'undefined') {
          query['middle_name'] = { [Op.iLike]: `${middleName}%` };
        }
      } else {
        query = {
          last_name: { [Op.iLike]: `${lastName}%` },
        };
      }
      const limit = req.body.limit ?? DEFAULT_LIMIT;
      const offset = req.body.offset ?? 0;

      const params = { offset, limit };
      const result = (await this.service('auth').getUsersWithCountAsync(query, params)) as { count: number; users: any };
      res.header('total', result.count.toString());
      this.responseData(res, result.users);
    } catch (error: any) {
      this.log.save('search-users-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Get users.
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      // Define params.
      const {
        id,
        email,
        phone,
        ipn,
        role,
        search,
        offset = 0,
        limit = 20,
      } = matchedData(req, {
        locations: ['query'],
      });
      const query: WhereOptions<UserAttributes> = {};

      if (id) {
        query.userId = id;
      }

      this.service('user').parseNameForGetUsersQuery(query, search);
      this.service('user').parseEmailForGetUsersQuery(query, email);
      this.service('user').parseIpnCollectionForGetUsersQuery(query, ipn);

      if (phone) {
        query.phone = { [Op.iLike]: `%${phone}%` };
      }

      if (role) {
        query.role = { [Op.iLike]: `%${role}%` };
      }

      const params = { offset, limit, order: [['createdAt', 'desc']] };
      const result: any = await this.service('auth').getUsersWithCountAsync(query, params);
      res.header('total', result.count);
      this.responseData(res, result.users);
    } catch (error: any) {
      this.log.save('get-users-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Find user by ID.
   */
  async findUserById(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.service('auth').getUser({ userId: req.params.id });
      res.status(200).send(user);
    } catch (error: any) {
      this.log.save('find-user-by-id-error', { userId: req.params.id, error: error.message, stack: error.stack }, 'error');
      res.status(404).send('User not found');
    }
  }

  /**
   * Logout by user ID.
   */
  async logoutByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;

      if (!this.service('auth').isUserId(userId)) {
        res.status(400).send('Invalid user ID');
        return;
      }

      const loginHistoryData = prepareLoginHistoryData(req, {
        actionType: 'logout',
      });

      await this.model('accessToken').destroy({ where: { userId: userId } });
      await this.model('refreshToken').destroy({ where: { userId: userId } });
      await this.model('sessions').destroy({ where: { userId: userId } });

      // Save to login_history as logout.
      if (loginHistoryData) {
        await this.model('loginHistory').create(loginHistoryData);
      }

      // Inform that accepted.
      res.status(201).send({ data: { accepted: true } });
    } catch (error: any) {
      this.log.save('logout-by-user-id-error', { userId: req.params.id, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Log off user.
   */
  async logOff(req: Request, res: Response): Promise<void> {
    let { forward } = matchedData(req, {
      locations: ['query'],
    });

    try {
      const userSession = req.session.passport?.user;
      if (!userSession) {
        res.status(401).send('Unauthorized');
        return;
      }

      let query = { userId: userSession.userId };
      this.log.save('log-off', { query, service: req.params.service }, 'info');

      const user = await this.service('auth').getUser(query);
      if (!user) {
        res.status(404).send('User not found');
        return;
      }

      await this.service('auth').removeServiceFromUserAsync({
        provider: req.params.service,
        userId: userSession.userId,
      });

      res.redirect(forward);
    } catch (error: any) {
      this.log.save(
        'log-off-error',
        {
          userId: req.session.passport?.user,
          error: error.message,
          stack: error.stack,
        },
        'error',
      );
      res.status(500).send(error.message);
    }
  }

  /**
   * Set valid phone.
   */
  async setValidPhone(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).send('Unauthorized');
        return;
      }

      const user = await this.service('auth').getUser({ userId: (req.user as any).id });

      const updatedUser = await this.service('auth').updateUser(
        { userId: user.userId },
        {
          valid: {
            ...user.valid,
            phone: true,
          },
        },
      );

      res.send(updatedUser);
    } catch (error: any) {
      this.log.save('set-valid-phone-error', { userId: (req.user as any).id, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Subscribe to promo.
   */
  async promoSubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { email, phone } = matchedData(req, {
        locations: ['query'],
      });

      if (!email && !phone) {
        res.status(400).send({ errorCode: 400, error: 'Empty query' });
        return;
      }

      const user: any = await this.service('auth').getUser(email ? { email: email.toLowerCase() } : { phone });

      let redirectUri = this.config.oauth.defaults.redirect_uri;
      if (Array.isArray(redirectUri)) {
        redirectUri = redirectUri[0];
      }
      const client = await this.service('auth').getClientByRedirectUri(redirectUri);

      if (!client) {
        res.status(400).send({ errorCode: 400, error: 'Default client not found' });
        return;
      }

      if (user || (user.status && user.status != 'import')) {
        let query = `client_id=${client.clientId}&redirect_uri=${redirectUri}&state=subscriptions`;
        if (email) {
          query += `&user[email]=${email}`;
        }
        res.redirect(`/authorise?${query}`);
      } else {
        req.session.user = { email, phone };
        req.session.save(() => res.redirect('/promo'));
      }
    } catch (error: any) {
      this.log.save('promo-subscribe-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Cleanup confirmation code.
   */
  async clearConfCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = matchedData(req, { locations: ['query'] });
      await this.service('auth').removeConfirmCode({ code });
      res.send('');
    } catch (error: any) {
      this.log.save('clear-conf-code-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Send confirmation code to new email.
   */
  async sendToNewEmailCode(req: Request, res: Response): Promise<void> {
    try {
      let { email } = matchedData(req, {
        locations: ['query'],
      });
      email = email.toLowerCase();

      // Delete old confirmation code.
      await this.service('auth').removeConfirmCode({ email });

      // Define test confirmation code if exist.
      const testConfirmations = this.config.testConfirmations?.codes ?? [];
      let testCodeObj: any;
      testConfirmations.forEach((v: any) => {
        if (v.emails?.includes(email)) testCodeObj = v;
      });

      let randomCode = testCodeObj?.confirmationCode ?? this.service('auth').generatePinCode();

      const ttlMinutes = this.config.confirmCode?.ttlMinutes ?? 60;
      const expiresIn = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await this.service('auth').removeConfirmCode({ email });
      await this.service('auth').saveConfirmCodeAsync({
        email,
        code: randomCode,
        counter: 0,
        expiresIn,
      });

      let { confirmCodeEmailTemplate = '{{code}}', confirmCodeEmailChangeHeader = 'Підтвердження електронної пошти' } = this.config;

      const confirmCodeEmailText = confirmCodeEmailTemplate.replace('{{code}}', randomCode);
      if (!testCodeObj) {
        await this.service('notify').sendMail(email, confirmCodeEmailText, confirmCodeEmailChangeHeader);
      }
      res.send();
    } catch (error: any) {
      this.log.save('send-to-new-email-code-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Check email.
   */
  async checkEmail(req: Request, res: Response): Promise<void> {
    let { email } = matchedData(req, { locations: ['query'] });
    email = email.toLowerCase();

    const query = Sequelize.where(Sequelize.fn('lower', Sequelize.col('email')), email);
    let isExist = false;
    let isAllowed = true;

    this.log.save('check-email-get-user-request', { query }, 'info');

    try {
      const user = await this.service('auth').getUser(query);

      this.log.save('check-email-get-user-response', { query }, 'info');

      // Check if user exists in the id database.
      isExist = !!user;

      if (this.service('ldap').isEnabled && this.service('ldap').isRequired) {
        // Obtain user data from LDAP.
        const user = await this.service('ldap')
          .findUserByPrincipal(email)
          .catch((error) => {
            this.log.save('check-email-ldap-error', { query, error: error?.message }, 'error');
          });

        // Check if user exists in LDAP.
        isAllowed = !!user;
      }
    } catch (error: any) {
      this.log.save('check-email-get-user-error', { query, error: error?.message }, 'error');
    }

    this.log.save('check-email-ldap-response', { query, isAllowed, isExist }, 'info');
    this.responseData(res, { isExist, isAllowed });
  }

  /**
   * Set new email.
   */
  async setToNewEmail(req: Request, res: Response): Promise<void> {
    let { email, code_email: emailCode, code_phone: phoneCode } = matchedData(req, { locations: ['query'] });
    email = email.toLowerCase();

    let user;
    try {
      user = await this.service('auth').getUser({ userId: (req.user as any).id });
    } catch (error: any) {
      this.log.save('set-to-new-email-get-user-error', { userId: (req.user as any).id, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
      return;
    }

    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    try {
      // For cases with additional phone confirmation.
      if (phoneCode) {
        const confirmCode = await this.service('auth').getValidConfirmCode({
          phone: user.phone,
          code: phoneCode,
        });

        if (confirmCode) {
          await this.service('auth').removeConfirmCode({ phone: user.phone! });
        } else {
          await this.service('auth').incrementConfirmCodeCounterAsync({
            phone: user.phone,
          });
          throw new Error('Invalid phone confirmation code.');
        }
      }

      const confirmCode = await this.service('auth').getValidConfirmCode({
        email,
        code: emailCode,
      });
      if (confirmCode) {
        await this.service('auth').removeConfirmCode({ email });
      } else {
        await this.service('auth').incrementConfirmCodeCounterAsync({ email });
        throw new Error('Invalid email confirmation code.');
      }
    } catch (err) {
      this.log.save('set-to-new-email-check-code-error', { email, err }, 'error');
      res.status(400).send({ error: 'Invalid confirmation code.' });
      return;
    }

    try {
      const updatedUser = await this.service('auth').updateUser({ userId: (req.user as any).id }, { email, valid: { ...user.valid, email: true } });

      // TODO: Deprecate
      await this.model('userOldData').create({
        userId: user.userId,
        oldEmail: user.email,
      });

      res.send(updatedUser);
    } catch (error: any) {
      this.log.save('set-to-new-email-update-user-error', { userId: (req.user as any).id, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
    }
  }

  /**
   * Check phone confirmation code.
   */
  async checkPhoneConfirmationCode(req: Request, res: Response): Promise<void> {
    const { phone, code_phone: code } = matchedData(req, { locations: ['query'] });

    try {
      const codeEntity: any = await this.service('auth').getValidConfirmCode({
        phone,
        code,
      });

      if (!codeEntity?.code) {
        await this.service('auth').incrementConfirmCodeCounterAsync({ phone });
        throw new Error('Invalid phone confirmation code.');
      }
      await this.service('auth').removeConfirmCode({ phone: phone! });

      res.status(200).send({ isCodeConfirmed: true });
    } catch (error: any) {
      this.log.save('user-controller|check-phone-confirmation-code|error', error.message, 'error');
      res.status(400).send({ isCodeConfirmed: false, error: error.message });
    }
  }

  /**
   * Check email confirmation code.
   */
  async checkEmailConfirmationCode(req: Request, res: Response): Promise<void> {
    const { email, code_email: code } = matchedData(req, { locations: ['query'] });

    try {
      const codeEntity: any = await this.service('auth').getValidConfirmCode({ email, code });

      {
        const { code } = codeEntity ?? {};
        if (!code) {
          await this.service('auth').incrementConfirmCodeCounterAsync({ email });
          throw new Error('Invalid email confirmation code.');
        }

        await this.service('auth').removeConfirmCode({ email });
      }
    } catch (error: any) {
      this.log.save('user-controller|check-email-confirmation-code|error', error.message, 'error');
      res.status(400).send({ isCodeConfirmed: false, error: error.message });
      return;
    }

    res.status(200).send({ isCodeConfirmed: true });
  }

  /**
   * Update user Onboarding.
   */
  async updateUserOnboarding(req: Request, res: Response): Promise<void> {
    const { userId, onboardingTaskId, needOnboarding } = req.body;
    if (!userId) {
      res.status(400).send('User ID is required');
      return;
    }

    let user: any;
    try {
      user = await this.service('auth').updateUser({ userId }, { onboardingTaskId, needOnboarding });
    } catch (error: any) {
      this.log.save('update-user-onboarding-get-user-error', { userId, error: error.message, stack: error.stack }, 'error');
      res.status(500).send(error.message);
      return;
    }

    if (!user) {
      res.status(404).send('User not found');
      return;
    }

    const changedUser: any = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      avaUrl: user.avaUrl ?? avatarByGender(user.gender),
    };

    await saveSession(req, user);

    res.cookie('jwt', JSON.stringify(changedUser), {
      domain: this.config.domain ?? DEFAULT_COOKIE_DOMAIN,
    });
    res.send('ok');
  }

  /**
   * Update user by ID.
   */
  async updateUserInfoById(req: Request, res: Response): Promise<void> {
    const userId = req.params.id;

    const fieldMap: Record<string, keyof UserAttributes> = {
      email: 'email',
      phone: 'phone',
      role: 'role',
      gender: 'gender',
      birthday: 'birthday',
      isIndividualEntrepreneur: 'isIndividualEntrepreneur',
      legalEntityDateRegistration: 'legalEntityDateRegistration',
      address: 'address',
      passportSeries: 'passport_series',
      passportNumber: 'passport_number',
      passportIssueDate: 'passport_issue_date',
      passportIssuedBy: 'passport_issued_by',
      foreignersDocumentSeries: 'foreigners_document_series',
      foreignersDocumentNumber: 'foreigners_document_number',
      foreignersDocumentIssueDate: 'foreigners_document_issue_date',
      foreignersDocumentExpireDate: 'foreigners_document_expire_date',
      foreignersDocumentIssuedBy: 'foreigners_document_issued_by',
      foreigners_document_type: 'foreigners_document_type',
      idCardNumber: 'id_card_number',
      idCardIssueDate: 'id_card_issue_date',
      idCardIssuedBy: 'id_card_issued_by',
      idCardExpiryDate: 'id_card_expiry_date',
      addressStruct: 'addressStruct',
      onboardingTaskId: 'onboardingTaskId',
      needOnboarding: 'needOnboarding',
      isActive: 'isActive',
      isPrivateHouse: 'is_private_house',
      useTwoFactorAuth: 'useTwoFactorAuth',
      twoFactorType: 'twoFactorType',
    };

    const data: Partial<UserAttributes> = {};
    for (const [key, value] of Object.entries(fieldMap).filter(([key]) => typeof req.body[key] !== 'undefined')) {
      data[value] = req.body[key];
    }

    let user;
    try {
      user = await this.service('auth').getUser({ userId });
    } catch (error: any) {
      this.log.save('update-user-info-get-user-error', { userId, error: error.message, stack: error.stack }, 'error');
      res.status(404).send('User not found');
      return;
    }

    if (data.addressStruct && Object.values(data.addressStruct).length) {
      const validationError = this.service('user').validateAddressStruct(data);
      if (validationError) {
        res.status(400).send(validationError);
        return;
      }
    } else {
      data.addressStruct = user.addressStruct;
    }

    try {
      const updatedUser: any = await this.service('auth').updateUser({ userId }, data);

      // Save in history blocking/unblocking of user.
      if (updatedUser.isActive !== user.isActive) {
        await this.model('userAdminAction').create({
          user_id: userId,
          data: updatedUser,
          created_by: req.body.updateInitiator,
          action_type: user.isActive ? 'block' : 'unblock',
        });
      }

      const changedUser = {
        _id: updatedUser._id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        avaUrl: updatedUser.avaUrl ?? avatarByGender(updatedUser.gender),
      };

      await saveSession(req, updatedUser);

      res.cookie('jwt', JSON.stringify(changedUser), {
        domain: this.config.domain ?? DEFAULT_COOKIE_DOMAIN,
      });
      res.send('ok');
    } catch (error: any) {
      this.log.save('update-user-info-update-user-error', { userId, error: error.message, stack: error.stack }, 'error');
      res.status(400).send(error.message);
    }
  }

  /**
   * Prepare user.
   */
  async prepareUser(req: Request, res: Response): Promise<void> {
    const { name, surname, middlename, ipn, email, edrpou } = req.body;
    this.log.save('prepare-user', { body: req.body }, 'info');

    const userCode = calculateUserCode(ipn, edrpou);

    // Check if user exist by ipn.
    let userInfoByIpn;
    try {
      userInfoByIpn = await this.model('user')
        .findOne({ where: { ipn: userCode } })
        .then((row) => row?.dataValues);
    } catch (error: any) {
      this.log.save('prepare-user-get-user-error', { userCode, error: error.message, stack: error.stack }, 'error');
      this.responseError(res, "Can't get user info by ipn.");
      return;
    }

    // Check if user exist by email.
    let userInfoByMail;
    try {
      userInfoByMail = await this.model('user')
        .findOne({ where: { email } })
        .then((row) => row?.dataValues);
    } catch (error: any) {
      this.log.save('prepare-user-get-user-error', { email, error: error.message, stack: error.stack }, 'error');
      this.responseError(res, "Can't get user info by email.");
      return;
    }

    // Create user if not exists.
    if (!userInfoByIpn) {
      let newUser: any;
      try {
        newUser = await this.model('user').create({
          ipn: userCode,
          first_name: name,
          last_name: surname,
          middle_name: middlename,
        });
      } catch (error) {
        return this.responseError(res, {
          error: "Can't create new user in User table: " + error,
        });
      }
      if (!newUser?.userId) {
        return this.responseError(res, 'Error creating new user.');
      }
      const newUserId = newUser.userId;
      const newUserIpn = newUser.ipn;

      // Create empty object in Services table.
      let newUserServices: any;
      try {
        newUserServices = await this.model('userServices').create({
          userId: newUserId,
          provider: PREPARE_USER_PROVIDER,
          provider_id: newUserIpn,
          data: {},
        });
      } catch (error) {
        return this.responseError(res, {
          error: "Can't create new user services: " + error,
        });
      }
      if (!newUserServices?.userId) {
        return this.responseError(res, 'Error creating new user.');
      }

      return this.responseData(res, {
        userExist: false,
        userId: newUserId,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        middleName: newUser.middle_name,
        ipn: newUserIpn,
      });
    }

    if (userInfoByIpn && (!userInfoByMail || userInfoByMail.userId !== userInfoByIpn.userId)) {
      return this.responseData(res, {
        userExist: true,
        isMailDifferent: true,
        userId: userInfoByIpn.userId,
        email: userInfoByIpn.email,
        firstName: userInfoByIpn.first_name,
        lastName: userInfoByIpn.last_name,
        middleName: userInfoByIpn.middle_name,
        ipn: userInfoByIpn.ipn,
      });
    }

    return this.responseData(res, {
      userExist: true,
      userId: userInfoByIpn.userId,
      email: userInfoByIpn.email,
      firstName: userInfoByIpn.first_name,
      lastName: userInfoByIpn.last_name,
      middleName: userInfoByIpn.middle_name,
      ipn: userInfoByIpn.ipn,
    });
  }

  async setPassword(req: Request, res: Response): Promise<void> {
    const userId = req.body.userId;
    const email = req.body.email;

    try {
      // Make sure that the user exists.
      const user = await this.model('user')
        .findOne({ where: { userId } })
        .then((row) => row?.dataValues);
      if (!user) {
        this.log.save('set-password-error|user-not-found', { userId, email });
        res.status(404).send({ error: 'User not found' });
        return;
      }

      // Validate email.
      if (!email && !user.email) {
        res.status(400).send({ error: "`email` is required if user doesn't have one" });
        return;
      }

      // Validate password.
      const password = req.body.password;
      if (!password) {
        this.log.save('set-password-error|password-required', { userId, email });
        res.status(400).send({ error: '`password` is required' });
        return;
      }

      // Make sure that the password is strong enough
      const { strong, reason } = this.service('passwordManager').isStrongPassword(password);
      if (!strong) {
        this.log.save('set-password-error|weak-password', { userId, email, reason });
        res.status(400).send({ error: reason });
        return;
      }

      // Create a password hash.
      const passwordHash = await bcrypt.hash(password, HASHING_SALT_ROUNDS);

      // Try to find existing service record.
      const service = await this.model('userServices')
        .findOne({
          where: { userId, provider: 'local' },
        })
        .then((row) => row?.dataValues);

      if (!service) {
        // Create a new one.
        await this.model('userServices').create({
          userId,
          provider_id: email ?? user.email,
          provider: 'local',
          data: {
            password: passwordHash,
            oldPasswords: [],
            isChangeRequired: true, // raise the flag for the user to change the password on login
          },
        });

        // Overwrite the email if it's different.
        if (email && email !== user.email) {
          await this.model('user').update({ email }, { where: { userId } });
        }
      } else {
        // Update the existing one.
        await this.model('userServices').update(
          {
            data: {
              password: passwordHash,
              isChangeRequired: true, // raise the flag for the user to change the password on login
              oldPasswords: (service.data as any).oldPasswords ?? [],
            },
          },
          { where: { userId, provider: 'local' } },
        );
      }

      this.log.save('set-password-success', { userId, email });
      res.send({ success: true });
    } catch (error: any) {
      this.log.save('set-password-error', { userId, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({ error: 'Internal server error' });
    }
  }

  /**
   * Create a bare minimum user with a local provider.
   */
  async createUserLocal(req: Request, res: Response): Promise<void> {
    try {
      // Extract the field values from request body
      const { email, password, firstName, middleName, lastName, needOnboarding, onboardingTaskId, isChangeRequired = true } = req.body;

      // Validate mandatory fields
      if (!email) {
        res.status(400).send({ error: '`email` is required.' });
        return;
      }
      if (!password) {
        res.status(400).send({ error: '`password` is required.' });
        return;
      }
      if (!firstName) {
        res.status(400).send({ error: '`firstName` is required.' });
        return;
      }
      if (!lastName) {
        res.status(400).send({ error: '`lastName` is required.' });
        return;
      }

      // Make sure that the password is strong enough
      const { strong, reason } = this.service('passwordManager').isStrongPassword(password);
      if (!strong) {
        this.log.save('local-user-create|weak-password', { email, reason }, 'info');
        res.status(400).send({ error: reason });
        return;
      }

      // Do not allow duplicate emails
      const existingUser = await this.model('user')
        .findOne({ where: { email } })
        .then((row) => row?.dataValues);
      if (existingUser) {
        this.log.save('local-user-create|user-exists', { email }, 'info');
        res.status(400).send({ error: 'User with this email already exists.' });
        return;
      }

      // Generate a placeholder IPN with a special prefix and a random alphanumeric suffix
      const ipn = '#' + generateRandomBase36(10);

      // Create the user profile
      const user = await this.model('user')
        .create({
          ipn,
          email,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          provider: 'local',
          userIdentificationType: 'email',
          needOnboarding: !!needOnboarding,
          onboardingTaskId: onboardingTaskId ?? undefined,
        })
        .then((row) => row?.dataValues);

      // Create the local service record with a password hash
      const passwordHash = await this.service('passwordManager').hashPassword(password);
      await this.model('userServices').create({
        userId: user.userId,
        provider: 'local',
        provider_id: user.email!,
        data: { password: passwordHash, oldPasswords: [], isChangeRequired },
      });

      this.log.save('local-user-create|success', { userId: user.userId, email, firstName, middleName, lastName }, 'info');
      res.status(201).send({ success: true, userId: user.userId });
    } catch (error) {
      this.log.save('local-user-create|error', { error }, 'error');
      res.status(400).send({ error: 'Invalid request.' });
    }
  }

  /**
   * A method to erase personal data of a user.
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    // Check if route is available.
    if (this.config.enabledDeleteUser !== true) {
      return this.responseError(res, 'Delete user route is not available', 400);
    }

    const userId = req.body?.userId;

    if (!userId) {
      return this.responseError(res, 'User ID is required', 400);
    }

    const user = await this.model('user')
      .findOne({ where: { userId } })
      .then((row) => row?.dataValues);
    if (!user) {
      return this.responseError(res, 'User not found', 404);
    }

    try {
      // Remove personal data from the user record.
      await this.model('user').update(
        {
          email: null,
          password: null,
          first_name: null,
          last_name: null,
          middle_name: null,
          birthday: null,
          address: null,
          avaUrl: null,
          status: null,
          phone: null,
          valid: { phone: false, email: false },
          gender: null,
          provider: null,
          ipn: null,
          edrpou: null,
          role: 'individual',
          isLegal: false,
          isIndividualEntrepreneur: false,
          companyName: null,
          companyUnit: null,
          legalEntityDateRegistration: null,
          useTwoFactorAuth: false,
          twoFactorType: null,
          lockUserInfo: null,
          userIdentificationType: 'unknown',
          passport_series: null,
          passport_number: null,
          passport_issue_date: null,
          passport_issued_by: null,
          foreigners_document_series: null,
          foreigners_document_number: null,
          foreigners_document_issue_date: null,
          foreigners_document_expire_date: null,
          foreigners_document_issued_by: null,
          foreigners_document_type: {},
          id_card_number: null,
          id_card_issue_date: null,
          id_card_expiry_date: null,
          id_card_issued_by: null,
          onboardingTaskId: null,
          needOnboarding: false,
          addressStruct: {},
          isActive: false,
          is_private_house: false,
        } as any,
        { where: { userId } },
      );

      // Remove personal data from user's login history.
      await this.model('loginHistory').update({ user_name: '' }, { where: { user_id: userId } });

      // Delete all sessions, services, and clients-users records.
      await this.model('sessions').destroy({ where: { userId } });
      await this.model('userServices').destroy({ where: { userId } });
      await this.model('clientUser').destroy({ where: { userId } });

      const redis = this.service('redis');
      if (redis.isEnabled) {
        const tokens = await this.model('accessToken')
          .findAll({ where: { userId } })
          .then((rows) => rows.map((row) => row.dataValues));

        await Promise.all(
          tokens.map(({ accessToken }) => {
            const sha1AccessToken = crypto.createHash('sha1').update(accessToken).digest('hex');
            return redis.delete(`token.${sha1AccessToken}`);
          }),
        );
      }

      await this.model('accessToken').destroy({ where: { userId: userId } });
      await this.model('refreshToken').destroy({ where: { userId: userId } });

      this.log.save('delete-user|success', { userId });
      res.status(200).send({ success: true });
    } catch (error) {
      this.log.save('delete-user|error', { error }, 'error');
      res.status(400).send({ error: 'Invalid request.' });
    }
  }

  /**
   * Middleware to check if the forgot password feature is enabled.
   */
  async checkForgotPasswordConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    const config = this.config.auth_providers.local;
    if (!config?.isEnabled || !config?.isForgotPasswordEnabled) {
      res.status(405).send({ error: 'Method not allowed.' });
      return;
    }

    next();
  }

  /**
   * Sends a request to reset the password.
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const config = this.config.auth_providers.local;

    this.log.save('forgot-password-request', { body: req.body }, 'info');

    // Validate the request parameters
    const { email } = req.body;
    if (!email) {
      res.status(400).send({ error: 'missing-email', message: '`email` is required.' });
      return;
    }
    if (!validateEmail(email)) {
      res.status(400).send({ error: 'invalid-email', message: 'Invalid email format.' });
      return;
    }

    try {
      const localService = await this.model('userServices')
        .findOne({
          where: { provider: 'local', provider_id: email },
        })
        .then((row) => row?.dataValues);

      if (localService) {
        const {
          resetPasswordSubject = 'Запит на скидання паролю',
          resetPasswordBody = 'Перейдіть за посиланням для скидання паролю: {{link}}',
          resetPasswordUrl,
          resetPasswordTokenExpiration = 3600,
        } = config;

        // Update the service record
        const token = this.service('passwordManager').generateSecureToken();
        (localService.data as any).resetPasswordToken = token;
        (localService.data as any).resetPasswordTokenExpireAt = Date.now() + resetPasswordTokenExpiration * 1000;
        await this.model('userServices').update({ data: localService.data }, { where: { id: localService.id } });

        // Generate the email data
        const queryParams = new URLSearchParams({ token, email });
        const resetPasswordLink = `${resetPasswordUrl}?${queryParams.toString()}`;
        const body = resetPasswordBody.replace('{{link}}', resetPasswordLink);

        // Send email
        await this.service('notify').sendMail(email, body, resetPasswordSubject);

        this.log.save('forgot-password-email-sent', { email, userId: localService.userId }, 'info');
      } else {
        this.log.save('forgot-password-email-not-sent', { email, message: 'User not found' }, 'info');

        // Simulate a delay to prevent email enumeration
        await delay(Math.floor(Math.random() * 100) + 50);
      }

      // Return success even if the user doesn't exist to prevent email enumeration
      res.status(200).send({ success: true });
    } catch (error: any) {
      this.log.save('forgot-password-get-service-error', { email, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({ error: 'internal-server-error', message: 'Internal server error.' });
    }
  }

  /**
   * Obtain an authorized user's JWT signed with the application secret.
   */
  async getUserJwt(req: Request, res: Response): Promise<void> {
    // Make sure that a valid OAuth2 access token is provided either in query, or in the request context.
    const accessToken = req.query.access_token || res.locals?.oauth?.token?.accessToken;
    if (!accessToken) {
      this.log.save('get-user-jwt|error', { error: 'Access token is not defined.' }, 'error');
      res.status(400).send({ error: 'Unauthorized' });
      return;
    }

    // Make sure that the JWT secret is defined in the configuration.
    const jwtSecret = this.config?.jwt?.secret;
    if (!jwtSecret) {
      this.log.save('get-user-jwt|error', { error: 'JWT secret is not defined in the configuration.' }, 'error');
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    // The JWT expiration time in seconds (must be short).
    const jwtExpiresIn = this.config?.jwt?.expiresIn ?? DEFAULT_JWT_EXPIRATION_TIME;

    // Expect that userId is already set by authorization middleware.
    const userId = (req.user as any).id;
    if (!userId) {
      this.log.save('get-user-jwt|error', { error: 'User ID is not defined.' }, 'error');
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    // Sign the JWT with the user ID and the access token (note: no refresh token, so it can't be reused later).
    const token = jwt.sign({ userId, authTokens: { accessToken } }, jwtSecret, { expiresIn: jwtExpiresIn });
    res.send({ token });
  }

  /**
   * A method to reset the password using a token.
   */
  async passwordReset(req: Request, res: Response): Promise<void> {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      res.status(400).send({ error: 'missing-parameters', message: 'Invalid request parameters.' });
      return;
    }
    if (!validateEmail(email)) {
      res.status(400).send({ error: 'invalid-email', message: 'Invalid email format.' });
      return;
    }

    const { strong, reason } = this.service('passwordManager').isStrongPassword(password);
    if (!strong) {
      res.status(400).send({ error: 'weak-password', message: reason });
      return;
    }

    try {
      const localService = await this.model('userServices')
        .findOne({
          where: { provider: 'local', provider_id: email },
        })
        .then((row) => row?.dataValues);

      // Report user error if the service record doesn't exist
      if (!localService) {
        res.status(400).send({ error: 'invalid-token', message: 'Invalid token.' });
        return;
      }

      // Report user error if the token is invalid or expired
      if ((localService.data as any).resetPasswordToken !== token || Date.now() > (localService.data as any).resetPasswordTokenExpireAt) {
        res.status(400).send({ error: 'invalid-token', message: 'Invalid token.' });
        return;
      }

      // Make sure that the password was not used before
      const oldPasswords = (localService.data as any).oldPasswords ?? [];
      const isPasswordInOldPasswords = oldPasswords.some((hash: string) => this.service('passwordManager').verifyPasswordSync(password, hash));
      if (isPasswordInOldPasswords) {
        res.status(400).send({
          error: 'old-password',
          message: 'New password cannot be the same as any of the older passwords.',
        });
        return;
      }

      // Hash the new password
      const passwordHash = await this.service('passwordManager').hashPassword(password);
      (localService.data as any).password = passwordHash;

      // Keep only the latest `rememberLastPassword` password hashes
      oldPasswords.push(passwordHash);
      oldPasswords.splice(this.service('passwordManager').rememberLastPassword, oldPasswords.length);
      (localService.data as any).oldPasswords = oldPasswords;

      // Cleanup the token and expiration date
      delete (localService.data as any).resetPasswordTokenExpireAt;

      await this.model('userServices').update({ data: localService.data }, { where: { id: localService.id } });
      this.log.save('password-reset-success', { email, userId: localService.userId }, 'info');

      res.status(200).send({ success: true });
    } catch (error: any) {
      this.log.save('password-reset-error', { email, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({ error: 'internal-server-error', message: 'Internal server error.' });
    }
  }
}
