import crypto from 'crypto';
import { URL } from 'url';
import { promisify } from 'util';

import { Request as OAuthRequest, Response as OAuthResponse } from '@node-oauth/oauth2-server';
import { matchedData, query } from 'express-validator';
import { appendTraceMeta } from '@liquio/back-core';

import { profileCookieOptions } from '../lib/cookie_options';
import { getEnabledAuthProviders } from '../lib/auth_providers';
import { avatarByGender } from '../lib/helpers';
import { oauthErrorBody } from '../lib/http_error';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { ServerCrypt } from '../lib/server_crypt';
import { getSessionUserId, isTwoFactorCompleted } from '../lib/two_factor';
import { AuthMiddleware } from '../middleware';
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
    this.router.get('/auth_providers', this.getAuthProviders.bind(this));
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
      this.service('auth').ensureClientContext(),
      this.service('auth').readyClient(),
      authMiddleware.checkUserAccess({ requireUser: true }),
      this.checkUserClientScope.bind(this),
      this.checkTwoFactorAuth.bind(this),
      this.authorizeContinue.bind(this),
    );

    // Explicit consent step for clients with `need_scope_approve`: the decision is bound to the pending authorization request.
    this.router.get(
      '/authorise/consent',
      this.requireScopeConsent.bind(this),
      this.service('auth').ensureClientContext(),
      this.service('auth').readyClient(),
      authMiddleware.checkUserAccess({ requireUser: true }),
      this.getConsent.bind(this),
    );

    this.router.post(
      '/authorise/consent',
      this.requireScopeConsent.bind(this),
      this.service('auth').ensureClientContext(),
      this.service('auth').readyClient(),
      authMiddleware.checkUserAccess({ requireUser: true }),
      this.saveConsent.bind(this),
    );

    this.router.post(
      '/authorise/continue',
      this.service('auth').ensureClientContext(),
      this.service('auth').readyClient(),
      authMiddleware.checkUserAccess({ requireUser: true }),
      this.saveUserClientScope.bind(this),
    );
  }

  defaultRoute(req: Request, res: Response) {
    if (req.isAuthenticated()) res.send({ success: true, redirect: '/authorise/continue' });
    else res.redirect('/sign_in');
  }

  /**
   * List currently enabled login options for the login page.
   */
  getAuthProviders(req: Request, res: Response): void {
    res.send({ providers: getEnabledAuthProviders(this.config) });
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
      if (!(await this.service('auth').consumeSendQuota('twoFactor', phone, req.ip ?? req.socket?.remoteAddress))) {
        res.status(429).send({ error: 'Too many requests. Please try again later.' });
        return;
      }
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
    this.log.save('add-debug-user-code-request', { userId }, 'info');
    if ([code, userId, serverToken].some((v) => typeof v !== 'string')) {
      this.log.save('add-debug-user-code-wrong-params', { userId }, 'error');
      res.status(400).send({ error: { message: 'Code and user ID should be defined.' } });
      return;
    }
    this.log.save('add-debug-user-code-params-defined', { userId }, 'info');

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
      this.log.save('add-debug-user-code-auth-info-not-found', { userId }, 'error');
      res.status(400).send({ error: { message: 'Auth info not found.' } });
      return;
    }
    if (debugUserInfo.serverToken !== serverToken) {
      this.log.save('add-debug-user-code-incorrect-server-token', { userId }, 'error');
      res.status(400).send({ error: { message: 'Incorrect server token.' } });
      return;
    }
    const { clientId, expires } = debugUserInfo;
    if ([clientId, expires].some((v) => typeof v === 'undefined')) {
      this.log.save('add-debug-user-code-incorrect-auth-info', { userId }, 'error');
      res.status(500).send({ error: { message: 'Incorrect auth info. Check config.' } });
      return;
    }
    this.log.save('add-debug-user-code-auth-info-defined', { userId, clientId, expires }, 'info');

    // Define scope fields.
    const scope = this.config.oauth?.defaults?.scope_fields;
    if (!Array.isArray(scope)) {
      this.log.save('add-debug-user-code-incorrect-scope', { scope }, 'error');
      res.status(500).send({ error: { message: 'Incorrect scope. Check config.' } });
      return;
    }

    // Prepare auth code data to add.
    const authCodeData = { code, userId, clientId, expires, scope, redirectUri: this.config.oauth?.defaults?.redirect_uri?.[0] };

    // Delete existing auth code.
    try {
      await this.model('authCode').destroy({ where: { code } });
    } catch (error: any) {
      this.log.save('add-debug-user-code-delete-previous-code-record-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not delete previous auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Create auth code.
    let createdAuthCode;
    try {
      createdAuthCode = await this.service('auth').oAuthModel.saveCodeRecord(authCodeData);
    } catch (error: any) {
      this.log.save('add-debug-user-code-creating-error', { userId, clientId, expires, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not create auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Response.
    this.log.save('add-debug-user-code-response', { userId, clientId, expires }, 'info');
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
   * @deprecated Retired. Phone verification requires an SMS code, see `POST /user/info/phone/confirm`. Does not modify anything.
   */
  signInRequirementsPhoneSet(_req: Request, res: Response): void {
    res.status(410).send({ error: 'Use POST /user/info/phone/confirm with a valid SMS code.' });
  }

  /**
   * @deprecated Retired. It used to mark an arbitrary phone as verified without a code. Does not modify anything.
   */
  async signInRequirementsPhoneSetConfirm(_req: Request, res: Response): Promise<void> {
    res.status(410).send({ error: 'Use POST /user/info/phone/confirm with a valid SMS code.' });
  }

  async relogin(req: Request, res: Response): Promise<void> {
    const { client_id: clientId, redirect_uri: redirectUri } = matchedData(req, { locations: ['query'] });

    res.clearCookie('jwt', profileCookieOptions(req, this.config));

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
      const body = oauthErrorBody(error);
      res.status(body.statusCode).send(body);
      return;
    }

    try {
      const user = await this.service('auth').getUser({ userId: tokens.user.id });
      req.session.authorizationVersion ??= tokens.user.authorizationVersion;
      await saveSession(req, user);

      let jwtObj = {
        id: user.userId,
        first_name: user.first_name,
        avaUrl: user.avaUrl ?? avatarByGender(user.gender),
        last_name: user.last_name,
      };
      res.cookie('jwt', JSON.stringify(jwtObj), profileCookieOptions(req, this.config, { expires: new Date(tokens.accessTokenExpiresAt as any) }));
      res.send({
        user_id: tokens.userId,
        access_token: tokens.accessToken,
        exires: tokens.accessTokenExpiresAt,
      });
    } catch (error: any) {
      this.log.save('check-token-error', { error: error.message, stack: error.stack }, 'error');
      const body = oauthErrorBody(error, 'Unauthorized', 401);
      res.status(401).send(body);
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
        accessTokenHash: crypto.createHash('sha256').update(tokens.accessToken).digest('hex'),
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      });
    } catch (error: any) {
      this.log.save('create-tokens-error', { error: error.message, stack: error.stack, description: error.toString() }, 'error');
      const body = oauthErrorBody(error, 'Unauthorized', 401);
      res.status(401).send(body);
      return;
    }

    try {
      const user = await this.service('auth').getUser({ userId: tokens.user.id });
      req.session.authorizationVersion ??= tokens.user.authorizationVersion;
      await saveSession(req, user);

      res.cookie(
        'jwt',
        JSON.stringify({
          id: user.userId,
          first_name: user.first_name,
          avaUrl: user.avaUrl ?? avatarByGender(user.gender),
          last_name: user.last_name,
        }),
        profileCookieOptions(req, this.config, { expires: new Date(tokens.accessTokenExpiresAt as Date) }),
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
      const body = oauthErrorBody(error, 'Unauthorized', 401);
      res.status(401).send(body);
    }
  }

  /**
   * Add test code.
   */
  async addTestCode(req: Request, res: Response): Promise<void> {
    const { code, userId } = req.body;
    this.log.save('add-test-code-request', { userId: req.body?.userId }, 'info');
    if ([code, userId].some((v) => typeof v !== 'string')) {
      this.log.save('add-test-code-wrong-params', { userId }, 'error');
      res.status(400).send({ error: { message: 'Code and user ID should be defined.' } });
      return;
    }
    this.log.save('add-test-code-params-defined', { userId }, 'info');

    // Define test auth info.
    const testAuth = this.config.testAuth ?? [];
    const testAuthInfo = testAuth.find((v: any) => v.code === code && v.userId === userId);
    if (!testAuthInfo) {
      this.log.save('add-test-code-auth-info-not-found', { userId }, 'error');
      res.status(400).send({ error: { message: 'Auth info not found.' } });
      return;
    }
    const { clientId, expires } = testAuthInfo;
    if ([clientId, expires].some((v) => typeof v === 'undefined')) {
      this.log.save('add-test-code-incorrect-auth-info', { userId }, 'error');
      res.status(500).send({ error: { message: 'Incorrect auth info. Check config.' } });
      return;
    }
    this.log.save('add-test-code-auth-info-defined', { userId, clientId, expires }, 'info');

    // Define scope fields.
    const scope = this.config.oauth?.defaults?.scope_fields;
    if (!Array.isArray(scope)) {
      this.log.save('add-test-code-incorrect-scope', { scope }, 'error');
      res.status(500).send({ error: { message: 'Incorrect scope. Check config.' } });
      return;
    }

    // Prepare auth code data to add.
    const authCodeData = { code, userId, clientId, expires, scope, redirectUri: this.config.oauth?.defaults?.redirect_uri?.[0] };

    // Delete existing auth code.
    try {
      await this.model('authCode').destroy({ where: { code } });
    } catch (error: any) {
      this.log.save('add-test-code-delete-previous-code-record-error', { error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not delete previous auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Create auth code.
    let createdAuthCode;
    try {
      createdAuthCode = await this.service('auth').oAuthModel.saveCodeRecord(authCodeData);
    } catch (error: any) {
      this.log.save('add-test-code-creating-error', { userId, clientId, expires, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        message: 'Can not create auth code record.',
        details: error.message ?? error.toString(),
      });
      return;
    }

    // Response.
    this.log.save('add-test-code-response', { userId, clientId, expires }, 'info');
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
            return { id: userId, authorizationVersion: req.session.authorizationVersion };
          },
        },
      });
    } catch (error: any) {
      this.log.save('response-type-code-error', { error: error.toString() }, 'error');
      const body = oauthErrorBody(error, 'Unauthorized', 401);
      res.status(401).send(body);
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

    const url = new URL(req.body.redirect_uri);
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

  /**
   * Allows the authorization to continue only when the account has no 2FA configured
   * or the configured factor was completed in this login session.
   * The 2FA settings come from the database, never from the session user.
   */
  async checkTwoFactorAuth(req: Request, res: Response, next: NextFunction) {
    const userId = getSessionUserId(req);
    if (!userId) {
      res.redirect('/');
      return;
    }

    let account;
    try {
      account = await this.model('user')
        .findOne({ where: { userId }, attributes: ['userId', 'phone', 'useTwoFactorAuth', 'twoFactorType'] })
        .then((row) => row?.dataValues);
    } catch (error: any) {
      this.log.save('check-two-factor-auth-error', { userId, error: error.message }, 'error');
      res.status(500).send({ error: { message: 'Two-factor authentication check failed.' } });
      return;
    }

    // Unknown (e.g. deleted) user: do not continue.
    if (!account) {
      this.log.save('check-two-factor-auth-user-not-found', { userId }, 'warning');
      res.redirect('/');
      return;
    }

    const { useTwoFactorAuth, twoFactorType, phone } = account;

    // If useTwoFactorAuth is enabled, but the type of 2FA is not set, let the user in to set it.
    if (!useTwoFactorAuth || !twoFactorType) {
      return next();
    }

    // Only the proof bound to this user and the currently configured factor lets the user in.
    if (isTwoFactorCompleted(req, userId, twoFactorType)) {
      return next();
    }

    // Control for phone-based 2FA.
    if (twoFactorType === 'phone') {
      const auth = this.service('auth');
      auth
        .consumeSendQuota('twoFactor', phone as string, req.ip ?? req.socket?.remoteAddress)
        .then((allowed: boolean) => (allowed ? auth.sendPhoneConfirmCode(phone as string) : undefined))
        .catch((error: any) => this.log.save('check-two-factor-auth-send-code-error', { userId, error: error.message }, 'error'));
      res.redirect('/');
      return;
    }

    // Control for TOTP-based 2FA.
    if (twoFactorType === 'totp') {
      res.redirect('/totp');
      return;
    }

    // Unsupported factor type: fail closed.
    this.log.save('check-two-factor-auth-unsupported-type', { userId, twoFactorType }, 'error');
    res.redirect('/');
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
    }

    // A client that needs approval never gets consent recorded by a GET: continue only with a stored consent covering the scope.
    if (this.config.oauth.enforceScopeConsent && body.need_scope_approve) {
      try {
        const stored = await this.service('auth').getUserScopeByClient(userId, body.client_id);
        const approved = new Set(stored?.scope ?? []);
        if (stored && (body.scope as string[]).every((item) => approved.has(item))) return next();
        return res.redirect('/authorise/consent');
      } catch {
        return res.redirect('/');
      }
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
    } else if (this.config.oauth.enforceScopeConsent && body.need_scope_approve) {
      // Consent for such a client is recorded only by an explicit decision on POST /authorise/consent.
      res.status(403).send({ success: false, error: 'consent_required', redirect: '/authorise/consent' });
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

  /** The consent endpoints exist only when `oauth.enforceScopeConsent` is on. */
  requireScopeConsent(req: Request, res: Response, next: NextFunction) {
    if (!this.config.oauth.enforceScopeConsent) {
      res.sendStatus(404);
      return;
    }
    next();
  }

  private consentScope(body: Request['body']): string[] {
    const scope = Array.isArray(body.scope) ? body.scope : [];
    return scope.length === 0 ? [...this.config.oauth.defaults.scope_fields] : scope;
  }

  /** Returns the pending authorization request for the user to decide on, with a one-time token for the decision. */
  async getConsent(req: Request, res: Response) {
    const { body } = req;
    if (!body.need_scope_approve) {
      res.redirect('/authorise/continue');
      return;
    }
    const scope = this.consentScope(body);
    const csrfToken = crypto.randomBytes(32).toString('hex');
    req.session.consent = { csrfToken, clientId: body.client_id, redirectUri: body.redirect_uri, state: req.session.state, scope };
    await saveSession(req);
    res.set('Cache-Control', 'no-store');
    res.send({
      client_id: body.client_id,
      client_name: body.client_name,
      scope,
      csrf_token: csrfToken,
      approve_url: '/authorise/consent',
    });
  }

  /** Approves (stores the session's requested scope) or denies (stores nothing) the pending authorization request. */
  async saveConsent(req: Request, res: Response) {
    const { body } = req;
    const userId = getSessionUserId(req);
    const pending = req.session.consent;
    delete req.session.consent; // One-time: every outcome needs a fresh token.

    if (!userId) {
      res.send({ success: false, redirect: '/' });
      return;
    }
    if (!body.need_scope_approve) {
      res.status(400).send({ success: false, error: 'consent_not_required' });
      return;
    }

    const scope = this.consentScope(body);
    const supplied = String(req.get('x-csrf-token') ?? req.body?.csrf_token ?? '');
    const expected = Buffer.from(pending?.csrfToken ?? '');
    const given = Buffer.from(supplied);
    const tokenValid = expected.length > 0 && expected.length === given.length && crypto.timingSafeEqual(expected, given);
    const sameRequest =
      !!pending &&
      pending.clientId === body.client_id &&
      pending.redirectUri === body.redirect_uri &&
      pending.state === req.session.state &&
      pending.scope.length === scope.length &&
      pending.scope.every((item, index) => item === scope[index]);
    if (!tokenValid || !sameRequest) {
      await saveSession(req);
      res.status(403).send({ success: false, error: 'invalid_consent_request', redirect: '/authorise/consent' });
      return;
    }

    // The decision applies to the session's own authorization request; scope, client and redirect are never taken from the POST.
    if (req.body?.decision === 'approve') {
      await this.service('auth').upsertUserByClient({ userId, clientId: body.client_id, scope });
      await saveSession(req);
      res.send({ success: true, redirect: '/authorise/continue' });
    } else if (req.body?.decision === 'deny') {
      await saveSession(req);
      const url = new URL(body.redirect_uri);
      url.searchParams.set('error', 'access_denied');
      if (req.session.state) url.searchParams.set('state', req.session.state);
      res.send({ success: false, error: 'access_denied', redirect: url.toString() });
    } else {
      await saveSession(req);
      res.status(400).send({ success: false, error: 'invalid_decision', redirect: '/authorise/consent' });
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
    // Under Express 5 `req.query` is a fresh parse on every access, so delete from the OAuth request snapshot instead.
    if (request.query?.state === '') {
      delete request.query.state;
    }
    // The PKCE binding comes only from the authorization session (`readyClient`), never from the continue request.
    if (request.query) {
      delete request.query.code_challenge;
      delete request.query.code_challenge_method;
    }

    if (req.body.response_type !== 'code') {
      res.status(400).send({ error: 'unsupported_response_type', message: 'Only response_type=code is supported' });
      return;
    }

    await this.responseTypeCode(req, res, userId, request, response);
  }
}
