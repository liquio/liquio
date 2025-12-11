import { OAuthError, Request as OAuthRequest, Response as OAuthResponse } from '@node-oauth/oauth2-server';
import crypto from 'crypto';
import { matchedData, query } from 'express-validator';
import { URL } from 'url';
import { promisify } from 'util';

import { DEFAULT_COOKIE_DOMAIN } from '../config';
import { avatarByGender } from '../lib/helpers';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { ServerCrypt } from '../lib/server_crypt';
import { AuthMiddleware } from '../middleware';
import { appendTraceMeta } from '../middleware/async_local_storage';
import { saveSession } from '../middleware/session';
import { UserAttributes } from '../models';
import { Express, NextFunction, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

export class AuthController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'auth');
  }

  protected registerRoutes() {
    const authMiddleware = AuthMiddleware.get();

    this.router.get('/auth', this.service('auth').prepareUser('approve'), authMiddleware.checkUserAccess(), this.getAuth.bind(this));
    this.router.get('/sign_in', this.signIn.bind(this));
    this.router.get('/sign_in/requirements', this.signInRequirements.bind(this));
    this.router.get('/sign_in/requirements_phone', this.service('auth').prepareClient(), this.signInRequirementsPhone.bind(this));
    this.router.get('/sign_in/requirements_phone_set', this.signInRequirementsPhoneSet.bind(this));
    this.router.post('/sign_in/requirements_phone_set/confirm', this.signInRequirementsPhoneSetConfirm.bind(this));
    this.router.get(
      '/relogin',
      [query('client_id').exists().isString(), query('redirect_uri').exists().isString(), this.handleValidation.bind(this)],
      this.service('auth').readyClient(),
      this.relogin.bind(this),
    );
    this.router.get('/authorise', this.service('auth').prepareClient(), this.authUser.bind(this));
    this.router.post('/oauth/token', this.createTokens.bind(this));
    this.router.get('/oauth/token', this.checkToken.bind(this));

    // Route to add test code for all environment except "prod" and "production".
    if (process.env.NODE_ENV !== 'prod' && process.env.NODE_ENV !== 'production') {
      this.router.post('/oauth/token/test_code', this.auth.basic(), this.addTestCode.bind(this));
    }

    // Route to add debug code if debug enabled.
    if (this.config.isDebugEnabled) {
      this.router.post('/oauth/token/debug_user_code', this.auth.basic(), this.addDebugUserCode.bind(this));
    }

    this.router.get(
      '/authorise/continue',
      [query('redirect_uri').optional().isString(), this.handleValidation.bind(this)],
      this.service('auth').readyClient(),
      this.checkUserClientScope.bind(this),
      this.checkTwoFactorAuth.bind(this),
      this.authorizeContinue.bind(this),
    );

    this.router.post('/authorise/continue', this.service('auth').readyClient(), this.saveUserClientScope.bind(this));
  }

  defaultRoute(req: Request, res: Response) {
    if (req.isAuthenticated()) res.send({ success: true, redirect: '/authorise/continue' });
    else res.redirect('/sign_in');
  }

  signIn(req: Request, res: Response) {
    if (req.isAuthenticated()) {
      res.send({ success: true, redirect: '/authorise/continue' });
    }

    res.redirect('/');
  }

  /**
   * Get auth.
   */
  async getAuth(req: Request, res: Response): Promise<void> {
    const user = req.session?.passport?.user;
    const { useTwoFactorAuth, twoFactorType, totpChecked, phone, phoneChecked, userId } = user ?? {};

    // Check if two-factor authentication is needed.
    const twoFactorAuthNeeded = useTwoFactorAuth && !phoneChecked && !totpChecked;
    if (useTwoFactorAuth && twoFactorType === 'phone' && !phoneChecked) {
      await this.service('auth').sendPhoneConfirmCode(phone);
    }

    // Append trace meta.
    appendTraceMeta({ userId });

    // Save prepared user to session.
    req.session.preparedUser = req.prepared?.user;
    req.session.authInfo = req.user;
    await saveSession(req);

    // Save login history record (login allowed).
    const loginHistoryData = prepareLoginHistoryData(req, { actionType: 'login' });
    if (loginHistoryData) {
      await this.model('loginHistory').create(loginHistoryData);
    }

    // Response auth info.
    res.send({
      redirect: req.user?.userId && !twoFactorAuthNeeded && '/authorise/continue',
      twoFactorAuthNeeded,
      twoFactorType,
      info: req.user,
      user: req.prepared?.user,
      provider: req.user?.provider,
    });
  }

  /**
   * Add debug user code.
   * @param {object} req HTTP request.
   * @param {object} res HTTP response.
   */
  async addDebugUserCode(req: Request, res: Response): Promise<void> {
    const { code, userId, serverToken } = req.body;
    this.log.save('add-debug-user-code-request', { code, userId, serverToken }, 'info');
    if ([code, userId, serverToken].some((v) => typeof v !== 'string')) {
      this.log.save('add-debug-user-code-wrong-params', { code, userId }, 'error');
      res.status(400).send({ error: { message: 'Code and user ID should be defined.' } });
      return;
    }
    this.log.save('add-debug-user-code-params-defined', { code, userId }, 'info');

    // Define debug user info.
    const debugUsers = this.config.debugUsers ?? [];
    const decryptedDebugUsers = debugUsers.map((v: any) => ({
      code: ServerCrypt.decryptByServerPublicKey(v.encryptedCode),
      userId: ServerCrypt.decryptByServerPublicKey(v.encryptedUserId),
      clientId: ServerCrypt.decryptByServerPublicKey(v.encryptedClientId),
      expires: ServerCrypt.decryptByServerPublicKey(v.encryptedExpires),
      serverToken: ServerCrypt.decryptByServerPublicKey(v.encryptedServerToken),
    }));
    const debugUserInfo = decryptedDebugUsers.find((v: any) => v.code === code && v.userId === userId);
    if (!debugUserInfo) {
      this.log.save('add-debug-user-code-auth-info-not-found', { code, userId }, 'error');
      res.status(400).send({ error: { message: 'Auth info not found.' } });
      return;
    }
    if (debugUserInfo.serverToken !== serverToken) {
      this.log.save('add-debug-user-code-incorrect-server-token', { code, userId }, 'error');
      res.status(400).send({ error: { message: 'Incorrect server token.' } });
      return;
    }
    const { clientId, expires } = debugUserInfo;
    if ([clientId, expires].some((v) => typeof v === 'undefined')) {
      this.log.save('add-debug-user-code-incorrect-auth-info', { code, userId }, 'error');
      res.status(500).send({ error: { message: 'Incorrect auth info. Check config.' } });
      return;
    }
    this.log.save('add-debug-user-code-auth-info-defined', { code, userId, clientId, expires }, 'info');

    // Define scope fields.
    const scope = this.config.oauth?.defaults?.scope_fields;
    if (!Array.isArray(scope)) {
      this.log.save('add-debug-user-code-incorrect-scope', { scope }, 'error');
      res.status(500).send({ error: { message: 'Incorrect scope. Check config.' } });
      return;
    }

    // Prepare auth code data to add.
    const authCodeData = { code, userId, clientId, expires, scope };

    // Delete existing auth code.
    try {
      await this.model('authCode').destroy({ where: { code } });
    } catch (error: any) {
      this.log.save('add-debug-user-code-delete-previous-code-record-error', { error: error.message, stack: error.stack, code }, 'error');
      res.status(500).send({
        message: 'Can not delete previous auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Create auth code.
    let createdAuthCode;
    try {
      createdAuthCode = await this.model('authCode').create(authCodeData);
    } catch (error: any) {
      this.log.save('add-debug-user-code-creating-error', { code, userId, clientId, expires, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not create auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Response.
    this.log.save('add-debug-user-code-response', { code, userId, clientId, expires }, 'info');
    res.send({ data: createdAuthCode });
  }

  /**
   * @deprecated
   */
  async signInRequirements(req: Request, res: Response): Promise<void> {
    await promisify(req.logout)();

    res.render('sign_in_requirements', {
      client_requirements: req.session.client_requirements!.map((value) => {
        let obj: Record<string, any> = {
          name: value,
        };
        switch (value) {
          case 'bankid':
            obj.icon = 'form-social-icon-bankid';
            break;
          case 'eds':
            obj.icon = 'form-social-icon-ecp';
            break;
          case 'facebook':
            obj.icon = 'form-social-icon-facebook';
            break;
          case 'twitter':
            obj.icon = 'form-social-icon-twitter';
            break;
          case 'linkedin':
            obj.icon = 'form-social-icon-linked';
            break;
          case 'google':
            obj.icon = 'form-social-icon-gplus';
            break;
        }
        return obj;
      }),
    });
  }

  /**
   * @deprecated
   */
  signInRequirementsPhone(req: Request, res: Response): void {
    if (!req.isAuthenticated()) {
      res.redirect('/');
      return;
    }

    const user = req.session?.passport?.user;
    if (user.valid?.phone || user.provider === 'bankid' || user.provider === 'eds') {
      res.send({ success: true, redirect: '/authorise/continue' });
    } else {
      res.redirect('/');
    }
  }

  /**
   * @deprecated
   */
  signInRequirementsPhoneSet(req: Request, res: Response): void {
    if (!req.isAuthenticated()) {
      res.redirect('/sign_in');
      return;
    }

    const user = req.session?.passport?.user;
    res.render('sign_in_requirements_phone', {
      user_phone: user.phone,
      user_phone_musked: user.phone.substr(0, 3) + '*******' + user.phone.substr(-2),
    });
  }

  /**
   * @deprecated
   */
  async signInRequirementsPhoneSetConfirm(req: Request, res: Response) {
    if (!req.isAuthenticated()) {
      res.redirect('/sign_in');
      return;
    }

    try {
      const { phone } = req.body;

      const user = await this.service('auth').getUser({ userId: req.session?.passport?.user.userId });
      const query: any = {
        valid: {
          ...user.valid,
          phone: true,
        },
      };
      if (phone) {
        query.phone = phone;
      }

      const updatedUser = await this.service('auth').updateUser({ userId: req.session?.passport?.user.userId }, query);
      await this.service('auth').removeConfirmCode({ phone });
      await saveSession(req, updatedUser);
      res.send({ success: true, redirect: '/authorise/continue' });
    } catch (error: any) {
      this.log.save('sign-in-requirements-phone-set-confirm-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not set phone.',
        details: error.message ?? error.toString(),
      });
    }
  }

  async relogin(req: Request, res: Response): Promise<void> {
    const { client_id: clientId, redirect_uri: redirectUri } = matchedData(req, { locations: ['query'] });

    res.clearCookie('jwt', {
      domain: this.config.domain ?? DEFAULT_COOKIE_DOMAIN,
    });

    await promisify(req.logout)();
    await promisify(req.sessionStore.destroy)(req.sessionID);
    await promisify(req.session.save)();

    res.redirect(`/sign_in/requirements_phone?client_id=${clientId}&redirect_uri=${redirectUri}`);
  }

  async authUser(req: Request, res: Response): Promise<void> {
    if (!req.isAuthenticated()) {
      if (req.query.user) req.session.user = req.query.user;
      await saveSession(req);
      res.redirect(req.session.client!.requirements.length > 0 ? '/sign_in/requirements' : '/sign_in');
      return;
    }

    if (req.session.client!.requirements.length == 0) {
      res.redirect('/authorise/continue');
    }
    if (req.session.client!.requirements.length > 0 && req.session.client!.requirements.indexOf(req.user.provider) != -1) {
      res.redirect('/authorise/continue');
    }
    if (req.session.client!.requirements.length > 0 && req.session.client!.requirements.indexOf(req.user.provider) == -1) {
      res.redirect('/sign_in/requirements');
    }
  }

  async checkToken(req: Request, res: Response) {
    let request = new OAuthRequest(req);
    let response = new OAuthResponse(res);
    let tokens;

    try {
      tokens = await this.service('auth').server.authenticate(request, response);
    } catch (error: any) {
      res.status(error.status).send(new OAuthError(error.message, error));
      return;
    }

    try {
      const user = await this.service('auth').getUser({ userId: tokens.user.id });
      await saveSession(req, user);

      let jwtObj = {
        id: user.userId,
        first_name: user.first_name,
        avaUrl: user.avaUrl ?? avatarByGender(user.gender),
        last_name: user.last_name,
      };
      res.cookie('jwt', JSON.stringify(jwtObj), {
        domain: this.config.domain ?? DEFAULT_COOKIE_DOMAIN,
        expires: new Date(tokens.accessTokenExpiresAt as any),
      });
      res.send({
        user_id: tokens.userId,
        access_token: tokens.accessToken,
        exires: tokens.accessTokenExpiresAt,
      });
    } catch (error: any) {
      this.log.save('check-token-error', { error: error.message, stack: error.stack }, 'error');
      res.status(401).send(new OAuthError(error.message, error));
    }
  }

  async createTokens(req: Request, res: Response): Promise<void> {
    let request = new OAuthRequest(req);
    let response = new OAuthResponse(res);

    let tokens;

    try {
      tokens = await this.service('auth').server.token(request, response);
      this.log.save('create-tokens-success', {
        userId: tokens.user.id,
        accessTokenShort: `${tokens.accessToken.slice(0, 8)}****${tokens.accessToken.slice(-8)}`,
        accessTokenHash: crypto.createHash('sha256').update(tokens.accessToken).digest('hex'),
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      });
    } catch (error: any) {
      this.log.save('create-tokens-error', { error: error.message, stack: error.stack, description: error.toString() }, 'error');
      res.status(401).send(new OAuthError(error.message, error));
      return;
    }

    try {
      const user = await this.service('auth').getUser({ userId: tokens.user.id });
      await saveSession(req, user);

      res.cookie(
        'jwt',
        JSON.stringify({
          id: user.userId,
          first_name: user.first_name,
          avaUrl: user.avaUrl ?? avatarByGender(user.gender),
          last_name: user.last_name,
        }),
        {
          domain: this.config.domain ?? '.liquio.local',
          expires: new Date(tokens.accessTokenExpiresAt as Date),
        },
      );

      let response_object = {};

      let User: Record<string, any> = {};

      switch (req.body.grant_type) {
        case 'authorization_code':
          response_object = {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          };
          break;
        case 'client_credentials':
          if (!user) {
            break;
          }
          if (Array.isArray(tokens.scope) && tokens.scope.length > 0) {
            for (const key of tokens.scope) {
              User[key] = user[key as keyof UserAttributes];
            }
          }
          response_object = {
            access_token: tokens.accessToken,
            user: Object.keys(User).length > 0 ? User : undefined,
          };
          break;
      }
      res.send(response_object);
    } catch (error: any) {
      this.log.save('create-tokens-error', { error: error.message, stack: error.stack }, 'error');
      res.status(401).send(new OAuthError(error.message, error));
    }
  }

  /**
   * Add test code.
   */
  async addTestCode(req: Request, res: Response): Promise<void> {
    const { code, userId } = req.body;
    this.log.save('add-test-code-request', { body: req.body }, 'info');
    if ([code, userId].some((v) => typeof v !== 'string')) {
      this.log.save('add-test-code-wrong-params', { body: req.body, code, userId }, 'error');
      res.status(400).send({ error: { message: 'Code and user ID should be defined.' } });
      return;
    }
    this.log.save('add-test-code-params-defined', { body: req.body, code, userId }, 'info');

    // Define test auth info.
    const testAuth = this.config.testAuth ?? [];
    const testAuthInfo = testAuth.find((v: any) => v.code === code && v.userId === userId);
    if (!testAuthInfo) {
      this.log.save('add-test-code-auth-info-not-found', { code, userId, testAuth }, 'error');
      res.status(400).send({ error: { message: 'Auth info not found.' } });
      return;
    }
    const { clientId, expires } = testAuthInfo;
    if ([clientId, expires].some((v) => typeof v === 'undefined')) {
      this.log.save('add-test-code-incorrect-auth-info', { code, userId, testAuth }, 'error');
      res.status(500).send({ error: { message: 'Incorrect auth info. Check config.' } });
      return;
    }
    this.log.save('add-test-code-auth-info-defined', { code, userId, clientId, expires }, 'info');

    // Define scope fields.
    const scope = this.config.oauth?.defaults?.scope_fields;
    if (!Array.isArray(scope)) {
      this.log.save('add-test-code-incorrect-scope', { scope }, 'error');
      res.status(500).send({ error: { message: 'Incorrect scope. Check config.' } });
      return;
    }

    // Prepare auth code data to add.
    const authCodeData = { code, userId, clientId, expires, scope };

    // Delete existing auth code.
    try {
      await this.model('authCode').destroy({ where: { code } });
    } catch (error: any) {
      this.log.save('add-test-code-delete-previous-code-record-error', { code, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not delete previous auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Create auth code.
    let createdAuthCode;
    try {
      createdAuthCode = await this.model('authCode').create(authCodeData);
    } catch (error: any) {
      this.log.save('add-test-code-creating-error', { code, userId, clientId, expires, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not create auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Response.
    this.log.save('add-test-code-response', { code, userId, clientId, expires }, 'info');
    res.send({ data: createdAuthCode });
  }

  async responseTypeCode(req: Request, res: Response, userId: string, request: OAuthRequest, response: OAuthResponse): Promise<void> {
    let code;
    try {
      // CAVEAT: @node-oauth/oauth2-server 5.x.x expects scope value to be a string of scopes separated by whitespaces
      if (Array.isArray(request.body.scope)) {
        request.body.scope = request.body.scope.join(' ');
      }

      code = await this.service('auth').server.authorize(request, response, {
        authenticateHandler: {
          handle: () => {
            return userId;
          },
        },
      });
    } catch (error: any) {
      this.log.save('response-type-code-error', { error: error.toString(), details: error }, 'error');
      res.status(401).send(new OAuthError(error.message, error));
      return;
    }

    if (
      req.session.client_requirements &&
      req.session.client_requirements.length > 0 &&
      req.session.passport?.user &&
      !req.session.client_requirements.includes(req.session.passport.user.provider) &&
      req.session.client_requirements.includes('require_phone') &&
      !req.session.passport.user.valid.phone
    ) {
      res.redirect('/sign_in/requirements_phone_set');
      return;
    } else if (
      req.session.client_requirements &&
      req.session.client_requirements.length > 0 &&
      req.session.passport?.user &&
      !req.session.client_requirements.includes(req.session.passport.user.provider) &&
      !req.session.client_requirements.includes('require_phone') &&
      !req.session.passport.user.valid.phone
    ) {
      res.redirect('/sign_in/requirements');
      return;
    }

    const url = new URL(req.session.forward ?? req.body.redirect_uri ?? '/');
    url.searchParams.set('code', code.authorizationCode);
    if (req.session.state) {
      url.searchParams.set('state', req.session.state);
    }
    const [flash] = req.flash!('services_error');
    if (flash) {
      url.searchParams.set('services_error', flash);
    }
    res.redirect(url.toString());
  }

  async responseTypeToken(req: Request, res: Response, userId: string, request: OAuthRequest, response: OAuthResponse): Promise<void> {
    let token;
    try {
      token = await this.service('auth').responseTypeToken(request, response, userId);
    } catch (error: any) {
      this.log.save('response-type-token-error', { error: error }, 'error');
      res.status(401).send(new OAuthError(error.message, error));
      return;
    }

    if (
      req.session.client_requirements &&
      req.session.client_requirements.length > 0 &&
      req.session.passport?.user &&
      !req.session.client_requirements.includes(req.session.passport.user.provider) &&
      req.session.client_requirements.includes('require_phone') &&
      !req.session.passport.user.valid.phone
    ) {
      res.redirect('/sign_in/requirements_phone_set');
      return;
    } else if (
      req.session.client_requirements &&
      req.session.client_requirements.length > 0 &&
      req.session.passport?.user &&
      !req.session.client_requirements.includes(req.session.passport.user.provider) &&
      !req.session.client_requirements.includes('require_phone') &&
      !req.session.passport.user.valid.phone
    ) {
      res.redirect('/sign_in/requirements');
      return;
    }

    const { redirect_uri: redirectUri } = matchedData(req, { locations: ['query'] });
    const url = new URL(redirectUri);
    url.searchParams.set('access_token', token.accessToken);
    if (req.session.state) {
      url.searchParams.set('state', req.session.state);
    }
    const [flash] = req.flash!('services_error');
    if (flash) {
      url.searchParams.set('services_error', flash);
    }
    res.redirect(url.toString());
  }

  async checkTwoFactorAuth(req: Request, res: Response, next: NextFunction) {
    const user = req.session.passport?.user ?? req.session.passport;
    const { useTwoFactorAuth, phone, phoneChecked, twoFactorType, totpChecked } = user;

    // If useTwoFactorAuth is enabled, but the type of 2FA is not set, let the user in to set it.
    if (!useTwoFactorAuth || (useTwoFactorAuth && !twoFactorType)) {
      return next();
    }

    // Control for phone-based 2FA.
    if (twoFactorType === 'phone' && !phoneChecked) {
      this.service('auth').sendPhoneConfirmCode(phone);
      res.redirect('/');
      return;
    }

    // Control for TOTP-based 2FA.
    if (twoFactorType === 'totp' && !totpChecked) {
      res.redirect('/totp');
      return;
    }

    return next();
  }

  async checkUserClientScope(req: Request, res: Response, next: NextFunction) {
    let { body } = req;
    let userId;
    if (req.user?.userId) {
      userId = req.user.userId;
    } else if (req.session.passport?.user) {
      userId = req.session.passport.user.userId ?? req.session.passport.user.user_id;
    }
    if (body.scope.length === 0) {
      body.scope = this.config.oauth.defaults.scope_fields;
    }

    if (!userId) {
      return res.redirect('/');
    } else {
      try {
        await this.service('auth').upsertUserByClient({
          userId,
          clientId: body.client_id,
          scope: body.scope,
        });
        return next();
      } catch {
        res.redirect('/');
      }
    }
  }

  async saveUserClientScope(req: Request, res: Response) {
    let { body } = req;
    let userId;

    if (req.user?.userId) {
      userId = req.user.userId || (req.user as any).user_id;
    } else if (req.session.passport?.user) {
      userId = req.session.passport.user.userId ?? req.session.passport.user.user_id;
    }

    if (!userId) {
      res.send({ success: false, redirect: '/' });
    } else {
      await this.service('auth').upsertUserByClient({
        userId,
        clientId: body.client_id,
        scope: body.scope,
      });
      req.session.save(() => {
        res.send({ success: true, redirect: '/authorise/continue' });
      });
    }
  }

  async authorizeContinue(req: Request, res: Response) {
    let request = new OAuthRequest(req);
    let response = new OAuthResponse(res);
    let userId;
    if (req.user?.userId) {
      userId = req.user.userId;
    } else if (req.session.passport?.user) {
      userId = req.session.passport.user.userId ?? req.session.passport.user.user_id;
    }
    if (req.body.state === '') {
      delete req.body.state;
    }
    if (req.query.state === '') {
      delete req.query.state;
    }

    if (req.body.response_type === 'code') {
      this.responseTypeCode(req, res, userId, request, response);
    } else {
      this.responseTypeToken(req, res, userId, request, response);
    }
  }
}
