import OAuth2Server, { InvalidClientError, OAuthError, Request as OAuthRequest, Response as OAuthResponse } from '@node-oauth/oauth2-server';
import crypto from 'crypto';
import { matchedData, query } from 'express-validator';
import moment from 'moment';
import { Op } from 'sequelize';

import { Config, DEFAULT_CODE_RETRIES, DEFAULT_CODE_LENGTH } from '../config';
import { calculateUserCode } from '../lib/calculate_user_code';
import { generatePinCode } from '../lib/helpers';
import { OAuthModel } from '../lib/oauth_model';
import { saveSession } from '../middleware/session';
import {
  ClientAttributes,
  ClientUserAttributes,
  ClientUserCreationAttributes,
  ConfirmCodeAttributes,
  ConfirmCodeCreationAttributes,
  Models,
  UserAttributes,
  UserServicesAttributes,
  WhereAttributeHash,
  WhereOptions,
} from '../models';
import { CallbackFn, NextFunction, Request, Response } from '../types';
import { BaseService } from './base_service';

const SMS_CODE_WORD = 'Код: ';
const DEFAULT_CACHE_TTL = 600; // 10 minutes.
const DEFAULT_ACCESS_TOKEN_LIFETIME = 8 * 60 * 60; // 8 hours.
const DEFAULT_REFRESH_TOKEN_LIFETIME = 16 * 60 * 60; // 16 hours.
const MAX_CONFIRM_CODES_TO_KEEP = 5;

export class AuthService extends BaseService {
  public readonly accessTokenLifetime: number;

  private readonly oAuth2Server!: OAuth2Server;
  private readonly oAuth2Model!: OAuthModel;
  private readonly mappr = require('mappr');
  private readonly cfg!: Config['oauth'];

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    this.accessTokenLifetime = this.config.oauth?.accessTokenLifetimeInSeconds ?? DEFAULT_ACCESS_TOKEN_LIFETIME;
    this.cfg = this.config.oauth;
    this.oAuth2Model = new OAuthModel();
    this.oAuth2Server = new OAuth2Server({
      model: this.oAuth2Model,
      authorizationCodeLifetime: 240,
      accessTokenLifetime: this.accessTokenLifetime,
      refreshTokenLifetime: this.config.oauth?.refreshTokenLifetimeInSeconds ?? DEFAULT_REFRESH_TOKEN_LIFETIME,
      allowBearerTokensInQueryString: true,
      allowEmptyState: true,
    });
  }

  get server(): OAuth2Server {
    return this.oAuth2Server;
  }

  get oAuthModel(): OAuthModel {
    return this.oAuth2Model;
  }

  async init() {
    if (!this.cfg) {
      throw new Error('No OAuth configuration provided: config.oauth');
    }
    if (!this.cfg.defaults?.client_id) {
      throw new Error('No client_id provided in OAuth configuration: config.oauth.defaults.client_id');
    }
    if (!this.cfg.defaults?.redirect_uri) {
      throw new Error('No redirect_uri provided in OAuth configuration: config.oauth.defaults.redirect_uri');
    }
  }

  prepareUser(state: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const provider = req.user?.provider;
      if (!provider) {
        return next();
      }

      const mappingFunctions = this.mappr(this.express.passport.mapping[provider]);

      let preparedUser = {} as Record<string, any>;
      if (state === 'approve') {
        if (!req.isAuthenticated()) {
          return next();
        }

        let source = req.user.services[provider];
        if (source?.dataValues) {
          source = source.dataValues.data;
        }
        if (source) {
          preparedUser = mappingFunctions(source);
        }
      }

      const normalization = this.express.passport.normalization[provider];
      if (normalization) {
        for (let key in preparedUser) {
          const normalize = normalization[key];
          if (typeof normalize === 'function') {
            preparedUser[key] = normalize(preparedUser[key]);
          }
        }
      }

      req.prepared = { user: preparedUser };
      next();
    };
  }

  prepareClient() {
    return [
      query('client_id').isString(),
      query('client_secret').isString(),
      query('response_type').optional().default('code').isString(),
      query('state').isString(),
      query('redirect_uri').isString(),
      async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        let { client_id, client_secret, response_type, state, redirect_uri } = matchedData(req, { locations: ['query'] });

        try {
          const client = await this.oAuth2Model.getClient(client_id, client_secret);

          if (!client) {
            res.status(400).send({ message: 'Client not found' });
            return;
          }

          const session = req.session;
          session.client_id = client_id;
          session.client_secret = client.secret;
          session.redirect_uri = redirect_uri;
          session.state = state;
          session.client_requirements = client.requirements;
          session.scope = client.scope;
          session.response_type = response_type;
          session.client_name = client.client_name;
          session.need_scope_approve = client.need_scope_approve;
          session.client = client;
          await saveSession(req);

          this.log.save('preparedClient', { session }, 'info');
          next();
        } catch (error: any) {
          if (!error.statusCode) {
            this.log.save('prepareClientError', { error }, 'error');
            error.statusCode = 500;
          }
          res.status(error.statusCode).send(new OAuthError(error.message, error));
          return;
        }
      },
    ];
  }

  readyClient() {
    return [
      query('redirect_uri').optional().isString(),
      (req: Request, res: Response, next: NextFunction) => {
        if (typeof req.body !== 'object') {
          req.body = {};
        }
        req.body.client_id = req.query.client_id = req.session.client_id ?? this.cfg!.defaults!.client_id;
        req.body.client_secret = req.query.client_secret = req.session.client_secret ?? this.cfg!.defaults!.client_secret;
        req.body.redirect_uri = req.query.redirect_uri = req.session.redirect_uri ?? this.cfg!.defaults!.redirect_uri?.[0];
        req.body.state = req.query.state = req.session.state ?? '';
        req.body.response_type = req.query.response_type = req.session.response_type ?? 'code';
        req.body.need_scope_approve = 'need_scope_approve' in req.session ? req.session.need_scope_approve : this.cfg!.defaults!.need_scope_approve;
        req.query.need_scope_approve = req.body.need_scope_approve.toString();
        req.body.client_name = req.query.client_name = req.session.client_name ?? this.cfg!.defaults!.client_name;
        req.body.scope = req.session.scope ?? (this.cfg!.defaults!.scope || []);

        this.log.save('readyClient', { body: req.body }, 'info');
        next();
      },
    ];
  }

  private getAccessTokenExpiresAt() {
    let expires = new Date();

    expires.setSeconds(expires.getSeconds() + this.accessTokenLifetime);

    return expires;
  }

  async responseTypeToken(req: OAuthRequest, res: OAuthResponse, userId: string) {
    let { client_id, client_secret } = req.body;
    if (!client_id || !client_secret) {
      throw new InvalidClientError('Missing client_id or client_secret');
    }

    let client = await this.oAuthModel.getClient(client_id, client_secret);
    if (!client) throw new InvalidClientError('Client not found');

    const buffer = crypto.randomBytes(256);
    let accessToken = crypto.createHash('sha1').update(buffer).digest('hex');
    let savedToken = await this.oAuthModel.saveToken(
      {
        accessToken,
        accessTokenExpiresAt: this.getAccessTokenExpiresAt(),
        scope: client.scope,
        client,
        user: { userId } as any,
      },
      client,
      { userId },
    );
    return savedToken;
  }

  getConfirmCode(params: Record<string, any>, callback: CallbackFn<ConfirmCodeAttributes | null>) {
    this.model('confirmCode')
      .findOne({ where: params })
      .catch((err: Error) => {
        callback(err, null);
      })
      .then((confirmCode) => {
        callback(null, confirmCode?.dataValues);
      });
  }

  async getConfirmCodeAsync(params: Record<string, any>) {
    return new Promise((resolve, reject) => {
      this.getConfirmCode(params, (err, confirmCode) => {
        if (err) return reject(err);
        resolve(confirmCode);
      });
    });
  }

  async getValidConfirmCode(params: Record<string, any>) {
    const queryParams = {
      ...params,
      counter: { [Op.lte]: this.config.confirmCodeRetries ?? DEFAULT_CODE_RETRIES },
      expiresIn: { [Op.gt]: Models.db.fn('NOW') },
    };

    const confirmCode = await this.model('confirmCode').findOne({ where: queryParams });

    return confirmCode?.dataValues;
  }

  saveConfirmCode(params: ConfirmCodeCreationAttributes, callback: CallbackFn<ConfirmCodeAttributes | null>) {
    this.model('confirmCode')
      .create(params)
      .catch((err) => {
        callback(err, null);
      })
      .then((confirmCode) => {
        callback(null, confirmCode?.dataValues);
      });
  }

  async saveConfirmCodeAsync(params: ConfirmCodeCreationAttributes) {
    let expiresIn = params.expiresIn;

    if (expiresIn instanceof Date) {
      const minutes = Math.round((expiresIn.getTime() - Date.now()) / 60000);
      expiresIn = Models.db.literal(`NOW() + INTERVAL '1 MINUTE' * ${minutes}`) as any;
    }

    const processedParams = {
      ...params,
      expiresIn,
    };

    return new Promise((resolve, reject) => {
      this.saveConfirmCode(processedParams, (err, confirmCode) => {
        if (err) return reject(err);
        resolve(confirmCode);
      });
    });
  }

  /**
   * Removes old confirmation codes for the given email or phone, keeping only the latest N entries.
   * @param {object} params Params.
   */
  async removePreviousConfirmCodes(params: { email?: string; phone?: string }) {
    const { email, phone } = params;

    if (!email && !phone) return;

    const idsToDelete = (await this.model('confirmCode')
      .findAll({
        where: {
          ...(email && { email }),
          ...(phone && { phone }),
        },
        order: [['id', 'DESC']],
        offset: MAX_CONFIRM_CODES_TO_KEEP - 1,
        attributes: ['id'],
      })
      .then((records) => records.map((record) => record.get('id')))) as number[];

    if (idsToDelete.length === 0) {
      return;
    }

    await this.model('confirmCode').destroy({
      where: { id: idsToDelete },
    });

    this.log.save('previous-confirm-codes|deleted', { ids: idsToDelete }, 'info');
  }

  /**
   * Remove confirm code.
   * @param {object} params Params.
   */
  async removeConfirmCode(params: { code?: string; email?: string; phone?: string }) {
    const { code, email, phone } = params;

    if (!code && !email && !phone) {
      return;
    }

    return this.model('confirmCode').destroy({
      where: {
        ...(!!code && { code }),
        ...(!!email && { email }),
        ...(!!phone && { phone }),
      },
    });
  }

  incrementConfirmCodeCounter(params: any, callback: CallbackFn<number | null>) {
    // Check input params.
    const { email, phone } = params ?? {};
    if (!email && !phone) {
      return callback(new Error('Email or phone should be defined.'), null);
    }

    // Handle.
    this.model('confirmCode')
      .findOne({ where: params })
      .then((confirmCode: any) => {
        // Check if confirm code not exists.
        if (!confirmCode) {
          return callback(null, null);
        }

        // Increment counter and return.
        const { counter } = confirmCode;
        const nextCounter = counter + 1;

        if (nextCounter > (this.config.confirmCodeRetries ?? DEFAULT_CODE_RETRIES)) {
          let paramsToDestroy = {} as { email?: string; phone?: string };
          if (email) paramsToDestroy.email = email;
          if (phone) paramsToDestroy.phone = phone;
          this.model('confirmCode').destroy({ where: paramsToDestroy });
          this.log.save(
            'confirm-code-counter-max-value|deleted',
            {
              paramsToDestroy,
              nextCounter,
              maxCounter: this.config.confirmCodeRetries ?? DEFAULT_CODE_RETRIES,
            },
            'warn',
          );
        } else {
          this.model('confirmCode').update({ counter: nextCounter }, { where: params });
        }

        callback(null, nextCounter);
      });
  }

  async incrementConfirmCodeCounterAsync(params: Record<string, any>) {
    return new Promise((resolve, reject) => {
      this.incrementConfirmCodeCounter(params, (err, counter) => {
        if (err) return reject(err);
        resolve(counter);
      });
    });
  }

  /**
   * Generate pin code with default length or custom length from config.
   * @returns {string} Generated pin code.
   */
  generatePinCode(): string {
    const length = this.config.confirmCodeLength ?? DEFAULT_CODE_LENGTH;
    return generatePinCode(length);
  }

  async generateCustomAuthorizationCode(user: any, clientId: any, scope: any, expiresIn = 60) {
    const code = {
      authorizationCode: crypto.randomBytes(20).toString('hex'),
      expiresAt: Models.db.literal(`NOW() + INTERVAL '${expiresIn} SECOND'`),
      scope,
    };

    await this.oAuth2Model.saveAuthorizationCode(code as any, { clientId } as any, user);

    return code.authorizationCode;
  }

  addressToString({ index, region, district, street, city, building, korp, apt } = {} as any) {
    const { label: cityLabel } = city?.registerRecord ?? {};
    const { label: districtLabel } = district?.registerRecord ?? {};
    const streetFullName = street && [street.type, street.name].filter(Boolean).join(' ');
    const buildingFull = [building, korp].filter(Boolean).join('-');
    const aptFull = apt && `кв. ${apt}`;

    return [index, region?.name, districtLabel ?? district?.name, cityLabel ?? city?.name, streetFullName, buildingFull, aptFull]
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Get user by where condition.
   * @throws {Error} If user not found.
   */
  async getUser(where: WhereOptions): Promise<UserAttributes> {
    try {
      this.log.save('get-user', { where }, 'info');
      const { data } = await this.service('redis').getOrSetWithTimestamp(
        ['oauthmodel', 'getUser', where],
        () =>
          this.model('user')
            .findOne({ where, attributes: ['updatedAt'] })
            .then((row) => {
              const updatedAt = row?.dataValues.updatedAt;
              return updatedAt ? updatedAt.getTime() : Date.now();
            }),
        () =>
          this.model('user')
            .findAll({
              where,
              include: [{ model: this.model('userServices') }],
            })
            .then((rows) =>
              rows.map((row) => {
                const user: any = row.dataValues;
                user.user_services = user.user_services.map((row: any) => row.dataValues);
                return user;
              }),
            ),
        DEFAULT_CACHE_TTL,
      );

      if (!Array.isArray(data) || data.length === 0) {
        this.log.save('get-user-not-found', { where }, 'error');
        throw new Error('user not found');
      }

      let [user] = data;

      if (user.email) user.email = user.email.toLowerCase();
      if (user.birthday) user.birthday = moment(user.birthday).format('DD/MM/YYYY');
      if (user.addressStruct && Object.keys(user.addressStruct).length && this.addressToString(user.addressStruct)) {
        user.address = this.addressToString(user.addressStruct);
      }
      if (user.legalEntityDateRegistration) user.legalEntityDateRegistration = moment(user.legalEntityDateRegistration).format('DD/MM/YYYY');

      user.services = {};
      for (const service of user.user_services) {
        // Do not disclose sensitive data.
        delete service.data?.password;
        delete service.data?.oldPasswords;

        user.services[service.provider] = service;
        user.provider ??= service.provider;
      }

      user._id = user.userId;
      delete user.user_services;

      return user;
    } catch (error: any) {
      this.log.save('get-user-error', { where, error: error?.message ?? error.toString(), name: error?.name, stack: error?.stack }, 'error');
      throw error;
    }
  }

  getUsers(query: WhereOptions, callback: CallbackFn<UserAttributes[] | null>, params = {} as any) {
    this.model('user')
      .findAll({
        where: query,
        include: params.attributes ? [] : [{ model: this.model('userServices') }],
        ...params,
      })
      .then((rows) => rows.map((row) => row.dataValues as UserAttributes & { user_services: UserAttributes[] }))
      .then((rows) => {
        let users = [] as any;
        if (rows.length === 0) {
          this.log.save('get-users-empty-response', { query }, 'error');
          return callback(null, users);
        }
        for (let user of rows) {
          if (user.email) user.email = user.email.toLowerCase();
          if (user.birthday) user.birthday = moment(user.birthday).format('DD/MM/YYYY');
          if (user.legalEntityDateRegistration) user.legalEntityDateRegistration = moment(user.legalEntityDateRegistration).format('DD/MM/YYYY');

          const services: Record<string, any> = {};
          if (user.user_services) {
            for (let service of user.user_services) {
              services[service.provider!] = service;
            }
          }

          users.push({
            ...user,
            user_services: undefined,
            services,
          });
        }
        callback(null, users);
      });
  }

  async getUsersAsync(query: WhereOptions, params = {}) {
    return new Promise((resolve, reject) => {
      this.getUsers(
        query,
        (err, users) => {
          if (err) return reject(err);
          resolve(users);
        },
        params,
      );
    });
  }

  getUsersWithCount(query: WhereOptions, callback: CallbackFn<{ count: number; users: UserAttributes[] }>, params = {}) {
    this.model('user')
      .findAndCountAll({
        where: query,
        ...params,
      })
      .then(({ count, rows }) => {
        let users = [] as UserAttributes[];
        if (rows.length === 0) {
          this.log.save('get-users-empty-response', { query }, 'error');
          return callback(null, { count, users });
        }
        for (let row of rows) {
          const user = row.get();
          if (user.email) user.email = user.email.toLowerCase();
          if (user.birthday) user.birthday = moment(user.birthday).format('DD/MM/YYYY');
          if (user.legalEntityDateRegistration) user.legalEntityDateRegistration = moment(user.legalEntityDateRegistration).format('DD/MM/YYYY');
          users.push(user);
        }
        callback(null, { count, users });
      });
  }

  async getUsersWithCountAsync(query: WhereOptions, params = {}) {
    return new Promise((resolve, reject) => {
      this.getUsersWithCount(
        query,
        (err, users) => {
          if (err) return reject(err);
          resolve(users);
        },
        params,
      );
    });
  }

  findUser(id: string, callback: CallbackFn<UserAttributes | null>) {
    this.model('user')
      .findOne({
        where: { userId: id },
      })
      .then((user) => {
        return callback(null, user?.dataValues);
      });
  }

  saveUser(query: WhereAttributeHash, callback: CallbackFn<UserAttributes | null>) {
    this.log.save('save-user', { query }, 'info');
    if (query.email) {
      query.email = query.email.toLowerCase();
    }
    const { ipn, edrpou } = query;

    const userCode = calculateUserCode(ipn, edrpou);

    query.ipn = userCode;

    this.model('user')
      .create(query)
      .then((user) => {
        this.log.save('save-user-response', { user }, 'info');
        callback(null, user?.dataValues);
      })
      .catch((e) => {
        this.log.save('save-user-error', { error: e }, 'error');
        callback(e, null);
      });
  }

  saveUserWithServices(query: WhereAttributeHash, callback: CallbackFn<(UserAttributes & { user_services: UserServicesAttributes[] }) | null>) {
    this.log.save('save-user-with-services', { query }, 'info');
    if ('birthday' in query && query.birthday) {
      query.birthday = moment(query.birthday, 'DD.MM.YYYY').format('YYYY-MM-DD');
    }
    const { ipn, edrpou } = query;

    const userCode = calculateUserCode(ipn, edrpou);

    query.ipn = userCode;

    this.model('user')
      .create(query, {
        include: [this.model('userServices')],
      })
      .then((user) => user?.dataValues as UserAttributes & { user_services: UserServicesAttributes[] })
      .then((user) => {
        this.log.save('save-user-with-services-response', { user }, 'info');
        callback(null, user);
      })
      .catch((err) => {
        this.log.save('save-user-with-services-error', { error: err }, 'error');
        if (err.name === 'SequelizeUniqueConstraintError') {
          this.model('user')
            .findOne({ where: { ipn: query.ipn } })
            .then((row) => row?.dataValues)
            .then((user) => {
              if (!user) {
                return callback(new Error('Can not save user or find user with defined IPN.'), null);
              }
              const [userServices] = query.user_services;
              const userServicesQuery = {
                ...userServices,
                userId: user.userId,
              };
              this.log.save('save-user-services', { query: userServicesQuery }, 'info');
              this.model('userServices')
                .create(userServicesQuery, { returning: true })
                .then((row) => row?.dataValues)
                .then((services) => {
                  this.log.save('save-user-services-response', { services }, 'info');
                  callback(null, { ...user, user_services: [services] });
                })
                .catch((err) => {
                  this.log.save('save-user-services-error', { error: err }, 'error');
                  callback(err, null);
                });
            })
            .catch((err) => {
              this.log.save('get-user-to-append-user-services-error', { error: err }, 'error');
              callback(err, null);
            });
        } else {
          this.log.save('save-user-with-services-error-not-create-services', { error: err }, 'error');
          callback(err, null);
        }
      });
  }

  async saveUserWithServicesAsync(query: WhereAttributeHash): Promise<(UserAttributes & { user_services: UserServicesAttributes[] }) | null> {
    return new Promise((resolve, reject) => {
      this.saveUserWithServices(query, (err, user) => {
        if (err) return reject(err);
        resolve(user as any);
      });
    });
  }

  async updateUser(query: WhereAttributeHash, update: any): Promise<UserAttributes | null> {
    this.log.save('update-user', { query, updateQuery: update }, 'info');

    if (update.birthday) {
      update['birthday'] = moment(update['birthday'], 'DD/MM/YYYY').format('YYYY-MM-DD');
    }
    if (update.legalEntityDateRegistration) {
      update['legalEntityDateRegistration'] = moment(update['legalEntityDateRegistration'], 'DD/MM/YYYY').format('YYYY-MM-DD');
    }
    if (query.email) {
      query.email = query.email.toLowerCase();
    }

    try {
      await this.model('user').update(update, { where: query });
      this.log.save('update-user-response', { query }, 'info');
      // Invalidate cache for this user
      await this.service('redis').delete(['oauthmodel', 'getUser', query]);
      return await this.getUser(query);
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const [uniqueFieldError] = error.errors ?? [];
        const message = uniqueFieldError.message.charAt(0).toUpperCase() + uniqueFieldError.message.slice(1);
        throw new Error(`Can not update user. ${message}`);
      }
      this.log.save('update-user-error', { error: error }, 'error');
      throw error;
    }
  }

  removeServiceFromUser(where: WhereAttributeHash, callback: CallbackFn) {
    this.model('userServices')
      .destroy({ where })
      .then((rows) => {
        this.log.save('remove-service-from-user-response', { rows }, 'info');
        callback(null, null);
      });
  }

  async removeServiceFromUserAsync(where: WhereAttributeHash): Promise<void> {
    return new Promise((resolve, reject) => {
      this.removeServiceFromUser(where, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async createClientFromApi(body: ClientAttributes): Promise<ClientAttributes> {
    try {
      let client = await this.model('client').create(body);
      this.log.save('create-client-response', { client }, 'info');
      return client?.dataValues;
    } catch (error) {
      this.log.save('create-client-error', { error }, 'error');
      throw error;
    }
  }

  async removeClientFromApi(clientId: string): Promise<boolean> {
    try {
      await this.model('clientUser').destroy({
        where: { clientId },
        cascade: true,
      });
      await this.model('client').destroy({
        where: { clientId },
        cascade: true,
      });
      this.log.save('remove-client-response', { clientId }, 'info');
      return true;
    } catch (error) {
      this.log.save('remove-client-error', { error }, 'error');
      throw error;
    }
  }

  async getClientByRedirectUri(redirectUri: string, callback?: CallbackFn<ClientAttributes | null>) {
    if (callback) {
      this.model('client')
        .findOne({
          where: { redirectUri: { [Op.contains]: [redirectUri] } },
        })
        .then((client) => client?.dataValues)
        .then((client) => {
          if (client) {
            client.requirements ??= [];
          }
          callback(null, client);
        });
      return;
    }

    try {
      let client = await this.model('client')
        .findOne({
          where: {
            redirectUri: { [Op.contains]: redirectUri as any },
          },
        })
        .then((client) => client?.dataValues);
      if (!client) {
        this.log.save('get-client-by-redirect-uri', { error: 'client not found' }, 'error');
        return null;
      }
      client.requirements ??= [];
      this.log.save('get-client-by-redirect-uri-response', { client }, 'info');
      return client;
    } catch (error) {
      this.log.save('get-client-by-redirect-uri-error', { error }, 'error');
      return null;
    }
  }

  removeUser(email: string) {
    this.log.save('remove-user', { email }, 'info');
    return this.model('user').destroy({
      where: { email },
      force: true,
      cascade: true,
    });
  }

  async getUserScopeByClient(userId: string, clientId: string): Promise<ClientUserAttributes | undefined> {
    try {
      const user = await this.model('clientUser')
        .findOne({
          where: { userId, clientId },
        })
        .then((row) => row?.dataValues);
      return user;
    } catch (error) {
      this.log.save('get-user-scope-by-client-error', { error }, 'error');
      throw error;
    }
  }

  async upsertUserByClient(user: ClientUserCreationAttributes): Promise<ClientUserAttributes> {
    this.log.save('save-user-by-client', { user }, 'info');
    try {
      const clientUser = await this.getUserScopeByClient(user.userId, user.clientId);
      if (!clientUser) {
        return await this.model('clientUser')
          .create(user)
          .then((row) => row.dataValues);
      } else {
        return await this.model('clientUser')
          .update(
            { scope: user.scope },
            {
              where: { id: clientUser.id },
              returning: true,
            },
          )
          .then((row) => row[1][0].dataValues);
      }
    } catch (error: any) {
      this.log.save('upsert-user-by-client-error', { error: error.message }, 'error');
      throw error;
    }
  }

  async sendPhoneConfirmCode(phoneNumber: string) {
    // Define test confirmation code if exist.
    const testConfirmations = this.config.testConfirmations?.codes || [];
    let testCodeObj: any;
    testConfirmations.forEach((v: any) => {
      if (v.phones?.includes(phoneNumber)) testCodeObj = v;
    });

    let code = testCodeObj?.confirmationCode ?? this.generatePinCode();

    const ttlMinutes = this.config.confirmCode?.ttlMinutes ?? 60;
    const expiresIn = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.removePreviousConfirmCodes({ phone: phoneNumber });
    await this.saveConfirmCodeAsync({ phone: phoneNumber, code, counter: 0, expiresIn });

    if (testCodeObj) {
      return { sendBySms: { testUser: true } };
    }

    return this.service('notify').sendSms(phoneNumber, SMS_CODE_WORD + code);
  }

  /**
   * Check if the string is a valid internal user ID.
   */
  isUserId(userId: string): boolean {
    if (userId.length === 24) {
      return /^[0-9a-fA-F]{24}$/.test(userId);
    }
    return false;
  }

  /**
   * Destroy session data.
   */
  async destroySession(userId: string, loginHistoryData: object): Promise<void> {
    await this.model('accessToken').destroy({ where: { userId: userId } });
    await this.model('refreshToken').destroy({ where: { userId: userId } });
    await this.model('sessions').destroy({ where: { userId: userId } });

    // Save login history record (login blocked).
    if (loginHistoryData) {
      await this.model('loginHistory').create(loginHistoryData as any);
    }
  }

  /**
   * Try to associate user with a LDAP record
   * @param {object} user User object
   * @returns {Promise<boolean>} Whether user has passed LDAP authentication
   */
  async authenticateLdap(user: UserAttributes): Promise<boolean> {
    // Skip for users that have no identification type yet.
    if (!user?.userIdentificationType) {
      return true;
    }

    if (!this.service('ldap').isEnabled) {
      return true;
    }

    const email = user.email;
    if (!email) {
      return false;
    }

    // Compose ПІБ
    const fullName = [user.last_name ?? '', user.first_name ?? '', user.middle_name ?? '']
      .map((i) => i.trim())
      .filter((v) => !!v)
      .join(' ');

    // Try to find user by principal name (email).
    let ldapUser = await this.service('ldap')
      .findUserByPrincipal(email)
      .catch((error) => {
        this.log.save('ldap-find-user-by-principal-error', { email, fullName, error: error.toString() }, 'warn');
      });

    // Make sure that found user has the same full name.
    const userDescription = ldapUser?.description.toString();
    if (!userDescription || userDescription.toUpperCase() !== fullName.toUpperCase()) {
      ldapUser = undefined;
      this.log.save('ldap-find-by-full-name-not-match', { email, fullName }, 'warn');
    }

    // Make sure that the account is not disabled
    if (ldapUser?.userAccountControl) {
      const code = Number(ldapUser.userAccountControl);
      const flags = this.service('ldap').unpackUserAccountControl(code);
      if (flags.ACCOUNTDISABLE) {
        this.log.save('ldap-find-user-disabled', { email, fullName }, 'warn');
        ldapUser = undefined;
      }
    }

    // Save LDAP user info to session.
    if (ldapUser) {
      const { sAMAccountName, objectGUID, memberOf, dn, cn } = ldapUser;

      this.log.save('ldap-find-user-success', { email, fullName, sAMAccountName }, 'info');

      await this.model('userServices').upsert({
        userId: user.userId,
        data: { sAMAccountName, memberOf, dn, cn },
        provider: 'ldap',
        provider_id: Buffer.from(objectGUID as any).toString('hex'),
      });

      return true;
    }

    return false;
  }

  /**
   * Check email confirmation code.
   */
  async getCodeByEmailOnConfirmation(req: Request) {
    const { email, code_email } = req.body;

    if (code_email) {
      const code = await this.service('auth').getValidConfirmCode({
        email,
        code: req.body.code_email,
      });

      if (!code) {
        try {
          const counter = await this.service('auth').incrementConfirmCodeCounterAsync({ email });
          this.log.save('confirm-email-code-counter-incremented', { email, counter }, 'warn');
        } catch (error: any) {
          this.log.save('check-email-confirmation-code-error', { email, code: req.body.code_email, error: error.message }, 'error');
        }
        throw new Error("Email confirmation code doesn't match");
      }
    } else {
      req.prepared!.user.valid = {
        ...req.prepared!.user.valid,
        phone: false,
      };
    }
  }

  /**
   * Check phone confirmation code.
   */
  async getCodeByPhoneOnConfirmation(req: Request) {
    const { provider, code_phone } = req.body;

    // Skip step on certain providers
    if (provider === 'google' || provider === 'linkedin') {
      return;
    }

    if (code_phone) {
      const code = await this.service('auth').getValidConfirmCode({
        phone: req.prepared!.user.phone,
        code: req.body.code_phone,
      });

      if (!code) {
        try {
          const counter = await this.service('auth').incrementConfirmCodeCounterAsync({
            phone: req.prepared!.user.phone,
          });
          this.log.save('confirm-phone-code-counter-incremented', { phone: req.prepared!.user.phone, counter }, 'warn');
        } catch (error: any) {
          this.log.save(
            'check-phone-confirmation-code-error',
            { phone: req.prepared!.user.phone, code: req.body.code_phone, error: error.message },
            'error',
          );
        }
        throw new Error("Phone confirmation code doesn't match");
      }

      req.prepared!.user.valid = { phone: true };
    } else {
      req.prepared!.user.valid = {
        ...req.prepared!.user.valid,
        email: false,
      };
    }
  }

  /**
   * Check if user with the phone number already exists.
   */
  async checkUserByPhoneExistsOnConfirmation(req: Request) {
    if (req.prepared!.user.phone) {
      const user = await this.service('auth')
        .getUser({ phone: req.prepared!.user.phone })
        .catch(() => null);

      if (user) {
        throw new Error('Phone is already taken');
      }
    }
  }

  async getUserToSaveOnConfirmation(req: Request) {
    const preparedUser = req.session?.preparedUser;
    const authInfo = req.session?.authInfo;
    if (!preparedUser || !authInfo) {
      throw new Error('User session should be defined.');
    }
    let userToSave = {
      ...(req.prepared!.user ?? {}),
      ...(preparedUser ?? {}),
      ...{ user_services: authInfo?.services },
      ...{
        role: undefined,
        onboardingTaskId: undefined,
        needOnboarding: undefined,
        isActive: undefined,
      },
    };
    userToSave.birthday = userToSave.birthday ?? null;

    let profile = req.user!.services['eds'] ?? req.user!.services['govid'] ?? req.user!.services['diia'];
    userToSave.user_services = [
      {
        provider: req.user!.provider,
        provider_id: (req.user as any).user_id,
        data: profile,
      },
    ];

    return userToSave;
  }
}
