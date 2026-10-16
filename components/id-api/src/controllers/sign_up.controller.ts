import { promisify } from 'util';

import { body, check, matchedData, query } from 'express-validator';

import { validateEmail } from '../lib/helpers';
import { legacyConfirmationQueryGuard } from '../lib/legacy_get_confirmation';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { getSessionUserId, markTwoFactorCompleted } from '../lib/two_factor';
import { saveSession } from '../middleware/session';
import { UserAttributes } from '../models';
import { Express, Request, Response, Router } from '../types';
import { BaseController } from './base_controller';

export class SignUpController extends BaseController {
  constructor(router: Router, app: Express) {
    super(router, app, 'sign_up');
  }

  protected registerRoutes() {
    this.router.get('/sign_up', this.service('auth').readyClient(), this.signUp.bind(this));

    // Only sign up routes if sign is enabled.
    if (this.config.signUp?.isEnabled) {
      this.log.save('sign_up', { status: 'initialized' }, 'info');
      this.router.post('/sign_up', this.signUpUser.bind(this));
    }

    this.router.get('/sign_up/confirmation', this.service('auth').prepareUser('approve'), this.signUpConfirmationGet.bind(this));
    this.router.post(
      '/sign_up/confirmation',
      [
        ...['email', 'phone', 'code_email', 'code_phone'].map((field) => body(field).optional({ values: 'null' }).isString()),
        this.handleValidation.bind(this),
      ],
      this.signUpConfirmationPost.bind(this),
    );
    // Confirmation codes and recipients must not travel in URLs (logs, history, Referer): POST with a body is the supported form (SE-3930 IF-05).
    // The GET variants stay for one release behind `legacyGetConfirmation` (default true) and log a deprecation without the query.
    const legacyGet = legacyConfirmationQueryGuard(this.log, this.config);
    const legacyQuery = legacyConfirmationQueryGuard(this.log, this.config, ['phone', 'code']);
    const emailExist = [query('email').isString(), this.handleValidation.bind(this)];
    const emailSend = [query('email').isString(), this.handleValidation.bind(this)];
    const emailVerify = [query('email').notEmpty().toLowerCase(), query('code').isString(), this.handleValidation.bind(this)];
    const phoneExist = [query('phone').isString(), this.handleValidation.bind(this)];
    const phoneSend = [query('phone').isString(), this.handleValidation.bind(this)];
    const phoneVerify = [query('phone').isString(), query('code').isString(), this.handleValidation.bind(this)];
    const bodyEmail = body('email').isString();
    const bodyPhone = body('phone').isString();
    const bodyCode = body('code').isString();

    this.router.get('/sign_up/confirmation/email/exist', legacyGet, emailExist, this.checkEmailExist.bind(this));
    this.router.post('/sign_up/confirmation/email/exist', [bodyEmail, this.handleValidation.bind(this)], this.checkEmailExist.bind(this));
    this.router.get('/sign_up/confirmation/email/send', legacyGet, emailSend, this.sendEmailConfirm.bind(this));
    this.router.post('/sign_up/confirmation/email/send', [bodyEmail, this.handleValidation.bind(this)], this.sendEmailConfirm.bind(this));
    this.router.get('/sign_up/confirmation/email/verify', legacyGet, emailVerify, this.checkEmailConfirm.bind(this));
    this.router.post(
      '/sign_up/confirmation/email/verify',
      [body('email').notEmpty().toLowerCase(), bodyCode, this.handleValidation.bind(this)],
      this.checkEmailConfirm.bind(this),
    );
    this.router.get('/sign_up/confirmation/phone/exist', legacyGet, phoneExist, this.checkPhoneExist.bind(this));
    this.router.post('/sign_up/confirmation/phone/exist', [bodyPhone, this.handleValidation.bind(this)], this.checkPhoneExist.bind(this));
    this.router.get('/sign_up/confirmation/phone/send', legacyGet, phoneSend, this.auth.authoriseOptional(), this.sendPhoneConfirm.bind(this));
    this.router.post(
      '/sign_up/confirmation/phone/send',
      [bodyPhone, this.handleValidation.bind(this)],
      this.auth.authoriseOptional(),
      this.sendPhoneConfirm.bind(this),
    );
    this.router.get('/sign_up/confirmation/phone/verify', legacyGet, phoneVerify, this.checkPhoneConfirm.bind(this));
    // POST /phone/verify is the authorised "confirm my phone" action; the anonymous check-only POST is `/phone/check_code`.
    this.router.post(
      '/sign_up/confirmation/phone/check_code',
      [bodyPhone, bodyCode, this.handleValidation.bind(this)],
      this.checkPhoneConfirm.bind(this),
    );
    this.router.post(
      '/sign_up/confirmation/phone/verify',
      legacyQuery,
      [check('phone', ['body', 'query']).isString(), check('code', ['body', 'query']).isString(), this.handleValidation.bind(this)],
      this.auth.authorise(),
      this.checkPhoneConfirmAndSetAsConfirmed.bind(this),
    );
    this.router.post('/sign_up/confirmation/phone/set', this.auth.basic('user:write'), this.setPhone.bind(this));
    this.router.post(
      '/sign_up/confirmation/phone/check',
      [body('code').isString().notEmpty(), this.handleValidation.bind(this)],
      this.checkPhoneCode.bind(this),
    );
  }

  /**
   * A method to sign up a new user.
   */
  async signUpUser(req: Request, res: Response): Promise<void> {
    const { password, code } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;

    this.log.save('registration|request', { email }, 'info');

    // Email, password and the email confirmation code are required
    if (!email || !password || !code || typeof code !== 'string') {
      this.log.save('registration|user-error', { email, error: 'Email, password and confirmation code are required.' }, 'warning');
      res.status(400).json({
        error: 'missing-params',
        description: 'Email, password and confirmation code are required.',
      });
      return;
    }

    if (!validateEmail(email)) {
      this.log.save('registration|user-error', { email, error: 'Invalid email format.' }, 'warning');
      res.status(400).json({ error: 'invalid-email', description: 'Invalid email format.' });
      return;
    }

    // Make sure that the password is strong enough
    const { strong, reason } = this.service('passwordManager').isStrongPassword(password);
    if (!strong) {
      this.log.save('registration|user-error', { email, error: reason }, 'warning');
      res.status(400).send({ error: 'weak-password', description: reason });
      return;
    }

    // The account is created only for an email whose owner proved control of it with the code sent to that exact address.
    // The answer for a wrong, expired, used or missing code does not depend on whether the email is registered.
    const validCode = await this.service('auth')
      .getValidConfirmCode({ email, code })
      .catch(() => undefined);
    if (!validCode) {
      this.log.save('registration|user-error', { email, error: 'Invalid confirmation code.' }, 'warning');
      await this.service('auth')
        .incrementConfirmCodeCounterAsync({ email })
        .catch(() => undefined);
      res.status(400).json({ error: 'invalid-code', description: 'Invalid or expired confirmation code.' });
      return;
    }

    // Single use: only the request that actually deletes the code may continue (parallel replays delete nothing).
    const consumed = await this.model('confirmCode').destroy({ where: { id: validCode.id } });
    if (!consumed) {
      res.status(400).json({ error: 'invalid-code', description: 'Invalid or expired confirmation code.' });
      return;
    }
    await this.service('auth').removeConfirmCode({ email });

    // An already registered email gets the same public answer as a new one (no account-existence oracle) and nothing is created.
    const existingUser = await this.model('user').findOne({ where: { email } });
    if (existingUser) {
      this.log.save('registration|user-error', { email, error: 'User already exists.' }, 'warning');
      res.status(201).json({ message: 'User registered successfully' });
      return;
    }

    try {
      // Generate a placeholder IPN with a special prefix and a random alphanumeric suffix
      const ipn = '#' + Math.random().toString(36).substring(2, 12);

      // Extract the onboarding configuration from the registration config
      const { needOnboarding = false, onboardingTaskId = undefined } = this.config.signUp ?? {};

      // Create the user profile
      const user: UserAttributes = await this.model('user')
        .create(
          {
            ipn,
            email,
            valid: { email: true, phone: false },
            provider: 'local',
            userIdentificationType: 'email',
            needOnboarding: !!needOnboarding,
            onboardingTaskId: onboardingTaskId ?? undefined,
          },
          { returning: true },
        )
        .then((row) => row.dataValues);

      // Create the local service record with a password hash
      const passwordHash = await this.service('passwordManager').hashPassword(password);
      await this.model('userServices').create({
        userId: user.userId,
        provider: 'local',
        provider_id: user.email!,
        data: {
          password: passwordHash,
          oldPasswords: [],
          isSelfRegistered: true,
        },
      });

      this.log.save('registration|success', { userId: user.userId, email }, 'info');
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error: any) {
      this.log.save('registration|server-error', { email, error: error.message, stack: error.stack }, 'error');
      res.status(500).json({ error: 'server-error', description: 'Internal server error' });
    }
  }

  /**
   * Renders the sign up page.
   */
  async signUp(req: Request, res: Response): Promise<void> {
    const { passport } = req.session;
    const { user } = passport ?? {};

    if (!user?.provider || user.provider !== 'eds') {
      res.redirect('/');
      return;
    }

    res.render('sign_up_confirmation', {
      provider: 'local',
      user: req.session.user,
      client: req.query,
    });
  }

  /**
   * Legacy email existence check. Anonymous callers must not learn whether an account exists,
   * so the answer is always 'null' and no lookup is made. Duplicates are rejected after the code proves control of the address.
   */
  async checkEmailExist(req: Request, res: Response): Promise<void> {
    const { email } = matchedData<{ email: string }>(req, { locations: ['body', 'query'] });
    this.log.save('check-email-exist-request', { email: email.toLowerCase() }, 'info');
    res.send('null');
  }

  /**
   * Sends the email confirmation code.
   */
  async sendEmailConfirm(req: Request, res: Response): Promise<void> {
    let { email } = matchedData<{ email: string }>(req, { locations: ['body', 'query'] });
    email = email.toLowerCase();
    this.log.save('send-email-confirmation-code-params', { email }, 'info');

    // Rate limit before any lookup, so the answer does not depend on whether the email is registered.
    if (!(await this.service('auth').consumeSendQuota('email', email, req.ip ?? req.socket?.remoteAddress))) {
      res.status(429).send({ error: 'Too many requests. Please try again later.' });
      return;
    }

    // Define test confirmation code if exist.
    const testEmails = this.config.testConfirmations?.codes ?? [];
    const testCodeObj = testEmails.find((v: any) => v.emails.includes(email));

    let user;
    try {
      user = await this.service('auth').getUser({ email });
    } catch (error: any) {
      this.log.save('send-email-confirmation-code-error', { error: error.message, stack: error.stack }, 'error');
    }

    // A registered account gets the same public answer as an unknown one, but no code is stored or sent.
    if (!user || user?.status === 'import') {
      let randomCode = testCodeObj ? testCodeObj.confirmationCode : this.service('auth').generatePinCode();
      let { confirmCodeEmailTemplate = '{{code}}', confirmCodeEmailHeader = 'Підтвердження реєстрації' } = this.config;
      const confirmCodeEmailText = confirmCodeEmailTemplate.replace('{{code}}', randomCode);

      try {
        const ttlMinutes = this.config.confirmCode?.ttlMinutes ?? 60;
        const expiresIn = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await this.service('auth').removeConfirmCode({ email });
        await this.service('auth').saveConfirmCodeAsync({ email, code: randomCode, counter: 0, expiresIn });
        if (!testCodeObj) {
          await this.service('notify').sendMail(email, confirmCodeEmailText, confirmCodeEmailHeader);
        }
        this.log.save('send-email-confirmation-code-sent', { email }, 'info');
      } catch (error: any) {
        this.log.save('send-email-confirmation-code-error', { email, error: error.message }, 'error');
      }

      res.send('null');
    } else {
      this.log.save('send-email-confirmation-code-email-already-exist', { email, userId: user?.userId }, 'info');

      // Tell the owner of the address, out of band, that the account exists (no code). Same rate limit as a code send.
      const {
        accountExistsEmailHeader = 'Обліковий запис уже існує',
        accountExistsEmailText = 'Для цієї електронної пошти вже існує обліковий запис. Увійдіть або, якщо ви забули пароль, скористайтеся відновленням пароля.',
      } = this.config;
      try {
        await this.service('notify').sendMail(email, accountExistsEmailText, accountExistsEmailHeader);
      } catch (error: any) {
        this.log.save('send-email-account-exists-notice-error', { email, error: error.message }, 'error');
      }

      res.send('null');
    }
  }

  /**
   * Checks the email confirmation code.
   */
  async checkEmailConfirm(req: Request, res: Response): Promise<void> {
    let { email, code } = matchedData<{ email: string; code: string }>(req, { locations: ['body', 'query'] });
    email = email.toLowerCase();
    this.log.save('check-email-confirmation-code-params', { email }, 'info');

    let confirm;
    try {
      confirm = await this.service('auth').getValidConfirmCode({
        email,
        code,
      });
    } catch (error: any) {
      this.log.save('check-email-confirmation-code-error', { email, error: error?.message }, 'error');
      res.send('null');
      return;
    }

    // If wrong code.
    if (!confirm) {
      this.log.save('check-email-confirmation-code-wrong-code', { email }, 'info');

      try {
        const counter = await this.service('auth').incrementConfirmCodeCounterAsync({ email });
        this.log.save('confirm-email-code-counter-incremented', { email, counter }, 'warning');
      } catch (error: any) {
        this.log.save('check-email-confirmation-code-error', { email, error: error?.message }, 'error');
      }

      res.send('null');
      return;
    }

    this.log.save('check-email-confirmation-code-correct-code', { email }, 'info');
    res.send('confirm');
  }

  /**
   * Legacy phone existence check. Anonymous callers must not learn whether an account exists,
   * so the answer is always `false` and no lookup is made. Duplicates are rejected after the code proves control of the number.
   */
  async checkPhoneExist(req: Request, res: Response): Promise<void> {
    const { phone } = matchedData<{ phone: string }>(req, { locations: ['body', 'query'] });
    this.log.save('check-phone-get-user-request', { phone }, 'info');
    res.send(false);
  }

  /**
   * Sanitizes the email address.
   */
  private sanitizeEmail(email: string): string {
    const domainParts = email.split('@')[1].split('.');
    domainParts.shift();
    const localPart = email.slice(0, 1); // Use slice instead of substr
    const obfuscatedDomain = email.split('@')[1].split('.')[0].replace(/.*/g, '*');
    return `${localPart}*****@${obfuscatedDomain}.${domainParts.join('.')}`;
  }

  /**
   * Sends the phone confirmation code.
   */
  async sendPhoneConfirm(req: Request, res: Response): Promise<void> {
    const { phone } = matchedData<{ phone: string }>(req, { locations: ['body', 'query'] });

    this.log.save('send-phone-confirmation-code-requested', { phone }, 'info');

    try {
      if (!(await this.service('auth').consumeSendQuota('phone', phone, req.ip ?? req.socket?.remoteAddress))) {
        res.status(429).send({ error: 'Too many requests. Please try again later.' });
        return;
      }

      const body = await this.service('auth').sendPhoneConfirmCode(phone, (req.user as any)?.id ?? req.session?.passport?.user?.userId);
      res.send(body);
    } catch (error: any) {
      this.log.save('send-phone-confirmation-code-error', { phone, error: error.message }, 'error');
      res.status(error.statusCode ?? 500).send(error);
    }
  }

  /**
   * Checks the phone confirmation code.
   */
  async checkPhoneConfirm(req: Request, res: Response): Promise<void> {
    const { phone, code } = matchedData<{ phone: string; code: string }>(req, { locations: ['body', 'query'] });
    this.log.save('check-phone-confirmation-code-params', { phone }, 'info');

    let confirm;
    try {
      confirm = await this.service('auth').getValidConfirmCode({
        phone,
        code,
      });
    } catch (error: any) {
      this.log.save('check-phone-confirmation-code-error', { phone, error: error?.message }, 'error');
      res.send('null');
      return;
    }

    if (!confirm) {
      this.log.save('phone-confirmation-wrong-code', { phone }, 'warning');
      try {
        const counter = await this.service('auth').incrementConfirmCodeCounterAsync({
          phone,
        });
        this.log.save('confirm-phone-code-counter-incremented', { phone, counter }, 'warning');
      } catch (error: any) {
        this.log.save('check-phone-confirmation-code-error', { phone, error: error?.message }, 'error');
      }
    }

    res.send(confirm ? 'confirm' : 'null');
  }

  /**
   * Check phone confirmation code and set as confirmed (if correct code).
   */
  async checkPhoneConfirmAndSetAsConfirmed(req: Request, res: Response): Promise<void> {
    // Define params.
    const userId = req.user && (req.user as any).id;
    const { phone, code } = matchedData<{ phone: string; code: string }>(req, { locations: ['body', 'query'] });

    this.log.save('phone-confirmation-request', { userId, phone }, 'info');

    // Check params.
    if (!userId || !phone || !code) {
      this.log.save('phone-confirmation-request-validation-error', { userId, phone }, 'error');
      res.status(400).send({
        error: {
          message: 'All needed params should be defined.',
          type: 'phone-confirmation-request-validation-error',
        },
      });
      return;
    }

    let user;
    try {
      user = await this.service('auth').getUser({ userId });
      if (!user) {
        res.status(404).send({
          error: {
            message: 'User not found.',
            type: 'user-not-found',
          },
        });
        return;
      }
    } catch (error: any) {
      this.log.save('user-get-error', { userId, error: error.message, stack: error.stack }, 'error');
      res.status(500).send({
        error: {
          message: error.message,
          type: 'user-get-error',
        },
      });
      return;
    }

    try {
      const updatedUser = await this.service('auth').confirmUserPhone(userId, phone, code);
      if (!updatedUser) {
        this.log.save('phone-confirmation-wrong-code', { userId, phone }, 'warning');
        res.send({ data: { isConfirmed: false } });
        return;
      }

      this.log.save('phone-confirmation-done', { userId, phone }, 'info');
      if (req.session?.passport?.user?.userId === userId) await saveSession(req, updatedUser);
      res.send({ data: { isConfirmed: true, user: updatedUser } });
    } catch (error: any) {
      this.log.save('phone-confirmation-error', { userId, phone, error: error.message }, 'error');
      res.status(500).send({
        error: {
          message: 'Unable to confirm phone.',
          type: 'phone-confirmation-error',
        },
      });
    }
  }

  /**
   * Set phone.
   */
  async setPhone(req: Request, res: Response): Promise<void> {
    // Define params.
    const { phone, user_id: userId } = req.query;
    this.log.save('phone-set-request', { userId, phone }, 'info');

    // Check params.
    if (!userId || !phone) {
      this.log.save('phone-set-request-validation-error', { userId, phone }, 'error');
      res.status(400).send({
        error: {
          message: 'All needed params should be defined.',
          type: 'phone-set-request-validation-error',
        },
      });
      return;
    }

    let user;
    try {
      user = await this.service('auth').getUser({ userId });
      if (!user) {
        res.status(404).send({
          error: {
            message: 'User not found.',
            type: 'user-not-found',
          },
        });
        return;
      }
    } catch (error: any) {
      this.log.save('phone-set-user-get-error', { userId, error: error.message }, 'error');
      res.status(500).send({
        error: {
          message: error.message,
          type: 'phone-set-user-get-error',
        },
      });
      return;
    }

    try {
      // Set user phone as confirmed.
      const updateQuery = {
        phone,
        valid: { ...user.valid, phone: true },
      };
      const updatedUser = await this.service('auth').updateUser({ userId }, updateQuery);
      this.log.save('phone-set-done', { userId, phone }, 'info');
      res.send({ data: { isConfirmed: true, updatedUser } });
    } catch (error: any) {
      this.log.save('phone-set-user-updating-error', { userId, phone, error: error.message }, 'error');
      res.status(500).send({
        error: {
          message: error.message,
          type: 'phone-set-user-updating-error',
        },
      });
    }
  }

  /**
   * Check phone confirmation code.
   */
  async checkPhoneCode(req: Request, res: Response): Promise<void> {
    const code = req.body.code;
    const user = req.session.passport?.user;
    const userId = getSessionUserId(req);
    if (!user || !userId) {
      res.status(401).send({ success: false, error: 'Unauthorized' });
      return;
    }

    let phone = user.phone;

    try {
      // The persisted account decides which phone and factor are in use; the session user may be a slim profile.
      const account = await this.model('user')
        .findOne({ where: { userId }, attributes: ['userId', 'phone', 'useTwoFactorAuth', 'twoFactorType'] })
        .then((row) => row?.dataValues);
      if (!account) {
        res.status(401).send({ success: false, error: 'Unauthorized' });
        return;
      }

      const isPhoneTwoFactor = !!account.useTwoFactorAuth && account.twoFactorType === 'phone';
      if (isPhoneTwoFactor) {
        phone = account.phone;
      }

      this.log.save('check-phone-code', { phone }, 'info');

      if (!code) {
        this.log.save('check-phone-confirmation-code-params-not-defined', { phone }, 'error');
        res.status(400).send('Phone confirmation code should be defined.');
        return;
      }

      const confirm = await this.service('auth').getValidConfirmCode({
        phone,
        code,
      });

      if (!confirm) {
        const counter = await this.service('auth').incrementConfirmCodeCounterAsync({ phone });
        this.log.save('confirm-phone-code-counter-incremented', { phone, counter }, 'warning');
        res.send({ success: false, error: 'code not valid' });
        return;
      }

      await this.service('auth').removeConfirmCode({ phone });
      if (isPhoneTwoFactor) {
        await markTwoFactorCompleted(req, userId, 'phone');
      } else {
        await saveSession(req, { ...req.session.passport?.user, phoneChecked: true });
      }
      res.send({ success: true });
    } catch (error: any) {
      this.log.save('check-phone-confirmation-code-error', { phone, error: error.message }, 'error');
      res.send({ success: false, error: error.message });
    }
  }

  /**
   * Renders the sign up confirmation page.
   * @deprecated
   */
  async signUpConfirmationGet(req: Request, res: Response): Promise<void> {
    const { user } = req || {};

    if (!user?.services?.eds) {
      res.redirect('/');
      return;
    }

    res.render('sign_up_confirmation', {
      valid: this.app.passport.valid[req.user!.provider!],
      user: req.prepared!.user,
      provider: req.user!.provider,
      client: (req as any).client,
    });
  }

  /**
   * Handles the sign up confirmation post request.
   */
  async signUpConfirmationPost(req: Request, res: Response): Promise<void> {
    req.body.email = req.body.email?.toLowerCase();
    req.prepared = {
      user: {
        ...req.body,
        valid: {},
        ipn: undefined,
        edrpou: undefined,
      },
    };

    const promises: Promise<unknown>[] = [
      this.service('auth').getCodeByEmailOnConfirmation(req),
      this.service('auth').checkUserByPhoneExistsOnConfirmation(req),
      this.service('auth').getCodeByPhoneOnConfirmation(req),
    ];

    try {
      await Promise.all(promises);

      const userToSave = await this.service('auth').getUserToSaveOnConfirmation(req);

      await this.service('auth').removeConfirmCode({ phone: userToSave.phone });
      await this.service('auth').removeConfirmCode({ email: req.body.email });

      let user;
      try {
        user = await this.service('auth').saveUserWithServicesAsync(userToSave);
        if (!user) {
          res.status(400).send({ error: 'User not found' });
          return;
        }
      } catch (error: any) {
        this.log.save('save-user-with-services-error', { error: error.message }, 'error');
        res.status(400).send({
          error: (Array.isArray(error.errors) ? error.errors[0] : error).message,
        });
        return;
      }

      try {
        await promisify(req.login as any)(user, { keepSessionInfo: true });
      } catch (error: any) {
        this.log.save('sign-up-login-error', { error: error.message }, 'error');
      } finally {
        await saveSession(req, user);

        const loginHistoryData = prepareLoginHistoryData(req, {
          actionType: 'login',
        });

        if (loginHistoryData) {
          await this.model('loginHistory').create(loginHistoryData);
        }

        await this.service('notify').subscribeUserForce(user.userId);

        res.send({
          success: true,
          redirect: '/authorise/continue',
        });
      }
      return;
    } catch (error: any) {
      this.log.save('sign-up-confirmation-error', { error: error.message, stack: error.stack }, 'error');
      res.send({ err: error.message ?? error.toString() });
    }
  }
}
