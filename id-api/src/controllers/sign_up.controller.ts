import { matchedData, query } from 'express-validator';
import Sequelize from 'sequelize';
import { promisify } from 'util';

import { validateEmail } from '../lib/helpers';
import { prepareLoginHistoryData } from '../lib/login_history_extractor';
import { saveSession } from '../middleware/session';
import { UserAttributes, UserServicesAttributes } from '../models';
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
    this.router.post('/sign_up/confirmation', this.signUpConfirmationPost.bind(this));
    this.router.get(
      '/sign_up/confirmation/email/exist',
      [query('email').isString(), this.handleValidation.bind(this)],
      this.checkEmailExist.bind(this),
    );
    this.router.get(
      '/sign_up/confirmation/email/send',
      [query('email').isString(), this.handleValidation.bind(this)],
      this.sendEmailConfirm.bind(this),
    );
    this.router.get(
      '/sign_up/confirmation/email/verify',
      [query('email').notEmpty().toLowerCase(), query('code').isString(), this.handleValidation.bind(this)],
      this.checkEmailConfirm.bind(this),
    );
    this.router.get('/sign_up/confirmation/phone/exist', this.checkPhoneExist.bind(this));
    this.router.get(
      '/sign_up/confirmation/phone/send',
      [query('phone').isString(), this.handleValidation.bind(this)],
      this.sendPhoneConfirm.bind(this),
    );
    this.router.get(
      '/sign_up/confirmation/phone/verify',
      [query('phone').isString(), query('code').isString(), this.handleValidation.bind(this)],
      this.checkPhoneConfirm.bind(this),
    );
    this.router.post(
      '/sign_up/confirmation/phone/verify',
      [query('phone').isString(), query('code').isString(), this.handleValidation.bind(this)],
      this.auth.authorise(),
      this.checkPhoneConfirmAndSetAsConfirmed.bind(this),
    );
    this.router.post('/sign_up/confirmation/phone/set', this.auth.basic(), this.setPhone.bind(this));
    this.router.post('/sign_up/confirmation/phone/check', this.checkPhoneCode.bind(this));
  }

  /**
   * A method to sign up a new user.
   */
  async signUpUser(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    this.log.save('registration|request', { email }, 'info');

    // Email and password are required
    if (!email || !password) {
      this.log.save('registration|user-error', { email, error: 'Email and password are required.' }, 'warn');
      res.status(400).json({
        error: 'missing-params',
        description: 'Email and password are required.',
      });
      return;
    }

    if (!validateEmail(email)) {
      this.log.save('registration|user-error', { email, error: 'Invalid email format.' }, 'warn');
      res.status(400).json({ error: 'invalid-email', description: 'Invalid email format.' });
      return;
    }

    // Make sure that there's no user with the same email
    const existingUser = await this.model('user').findOne({ where: { email } });
    if (existingUser) {
      this.log.save('registration|user-error', { email, error: 'User already exists.' }, 'warn');
      res.status(400).json({ error: 'email-exists', description: 'User already exists.' });
      return;
    }

    // Make sure that the password is strong enough
    const { strong, reason } = this.service('passwordManager').isStrongPassword(password);
    if (!strong) {
      this.log.save('registration|user-error', { email, error: reason }, 'warn');
      res.status(400).send({ error: 'weak-password', description: reason });
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
      res.status(201).json({
        message: 'User registered successfully',
        userId: user.userId,
      });
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
   * A method to check if the email exists.
   */
  async checkEmailExist(req: Request, res: Response): Promise<void> {
    let { email } = matchedData<{ email: string }>(req, { locations: ['query'] });
    email = email.toLowerCase();
    this.log.save('check-email-exist-request', { email }, 'info');

    // Only proceed if email has a valid format.
    if (!validateEmail(email)) {
      this.log.save('check-email-exist-error', { email, error: 'Invalid email format.' }, 'warn');
      res.send('null');
      return;
    }

    try {
      const query = Sequelize.where(Sequelize.fn('lower', Sequelize.col('email')), email.toLowerCase());

      const user = await this.service('auth').getUser(query);
      if (user) {
        res.send(user.password ? 'exist' : 'existWithout');
      } else {
        res.send('null');
      }
    } catch (err) {
      this.log.save('check-email-exist-error', { error: err }, 'error');
      res.send('null');
    }
  }

  /**
   * Sends the email confirmation code.
   */
  async sendEmailConfirm(req: Request, res: Response): Promise<void> {
    let { email } = matchedData<{ email: string }>(req, { locations: ['query'] });
    email = email.toLowerCase();
    this.log.save('send-email-confirmation-code-params', { email }, 'info');

    // Define test confirmation code if exist.
    const testEmails = this.config.testConfirmations?.codes ?? [];
    const testCodeObj = testEmails.find((v: any) => v.emails.includes(email));

    let user;
    try {
      user = await this.service('auth').getUser({ email });
    } catch (error: any) {
      this.log.save('send-email-confirmation-code-error', { error: error.message, stack: error.stack }, 'error');
    }

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
      res.send('exist');
    }
  }

  /**
   * Checks the email confirmation code.
   */
  async checkEmailConfirm(req: Request, res: Response): Promise<void> {
    let { email, code } = matchedData<{ email: string; code: string }>(req, { locations: ['query'] });
    email = email.toLowerCase();
    this.log.save('check-email-confirmation-code-params', { email, code }, 'info');

    let confirm;
    try {
      confirm = await this.service('auth').getValidConfirmCode({
        email,
        code,
      });
    } catch (error: any) {
      this.log.save('check-email-confirmation-code-error', { email, code, error: error?.message }, 'error');
      res.send('null');
      return;
    }

    // If wrong code.
    if (!confirm) {
      this.log.save('check-email-confirmation-code-wrong-code', { email, code }, 'info');

      try {
        const counter = await this.service('auth').incrementConfirmCodeCounterAsync({ email });
        this.log.save('confirm-email-code-counter-incremented', { email, counter }, 'warn');
      } catch (error: any) {
        this.log.save('check-email-confirmation-code-error', { email, code, error: error?.message }, 'error');
      }

      res.send('null');
      return;
    }

    this.log.save('check-email-confirmation-code-correct-code', { email, code }, 'info');
    res.send('confirm');
  }

  /**
   * Checks if the phone number exists.
   */
  async checkPhoneExist(req: Request, res: Response): Promise<void> {
    let phone = req.query.phone;

    // Log request.
    this.log.save('check-phone-get-user-request', { phone }, 'info');

    let user: (UserAttributes & { services?: UserServicesAttributes[] }) | null;
    try {
      user = await this.service('auth').getUser({ phone });
    } catch (error: any) {
      this.log.save('check-phone-get-user-error', { phone, error: error.message }, 'error');
      res.send(false);
      return;
    }

    // Log response.
    this.log.save('check-phone-get-user-response', { phone }, 'info');

    // Check phone.
    if (user && user.services && Object.entries(user.services).length !== 0) {
      res.send(true);
    } else {
      res.send(false);
    }
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
    const { phone } = matchedData<{ phone: string }>(req, { locations: ['query'] });

    this.log.save('send-phone-confirmation-code-requested', { phone }, 'info');

    try {
      const body = await this.service('auth').sendPhoneConfirmCode(phone);
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
    const { phone, code } = matchedData<{ phone: string; code: string }>(req, { locations: ['query'] });
    this.log.save('check-phone-confirmation-code-params', { phone, code }, 'info');

    let confirm;
    try {
      confirm = await this.service('auth').getValidConfirmCode({
        phone,
        code,
      });
    } catch (error: any) {
      this.log.save('check-phone-confirmation-code-error', { phone, code, error: error?.message }, 'error');
      res.send('null');
      return;
    }

    if (!confirm) {
      this.log.save('phone-confirmation-wrong-code', { phone, code }, 'warn');
      try {
        const counter = await this.service('auth').incrementConfirmCodeCounterAsync({
          phone,
        });
        this.log.save('confirm-phone-code-counter-incremented', { phone, counter }, 'warn');
      } catch (error: any) {
        this.log.save('check-phone-confirmation-code-error', { phone, code, error: error?.message }, 'error');
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
    const { phone, code } = matchedData<{ phone: string; code: string }>(req, { locations: ['query'] });

    this.log.save('phone-confirmation-request', { userId, phone, code }, 'info');

    // Check params.
    if (!userId || !phone || !code) {
      this.log.save('phone-confirmation-request-validation-error', { userId, phone, code }, 'error');
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
      const confirm = await this.service('auth').getValidConfirmCode({
        phone,
        code,
      });

      // Handle not confirmed.
      if (!confirm) {
        this.log.save('phone-confirmation-wrong-code', { userId, phone, code }, 'warn');
        const counter = await this.service('auth').incrementConfirmCodeCounterAsync({ phone: phone });
        this.log.save('confirm-phone-code-counter-incremented', { phone, counter }, 'warn');
        res.send({ data: { isConfirmed: false } });
        return;
      }

      // Remove code.
      try {
        await this.service('auth').removeConfirmCode({ phone });
      } catch (error: any) {
        this.log.save('phone-confirmation-code-removing-error', { userId, phone, code, error: error.message }, 'error');
      }

      // Set user phone as confirmed.
      const updateQuery = {
        phone,
        valid: { ...user.valid, phone: true },
      };

      try {
        await this.service('auth').updateUser({ userId }, updateQuery);
        this.log.save('phone-confirmation-done', { userId, phone, code }, 'info');
        res.send({ data: { isConfirmed: true, user } });
      } catch (error: any) {
        this.log.save('phone-confirmation-user-updating-error', { userId, phone, code, error: error.message }, 'error');
        res.status(500).send({
          error: {
            message: error.message,
            type: 'phone-confirmation-user-updating-error',
          },
        });
      }
    } catch (error: any) {
      this.log.save('phone-confirmation-error', { userId, phone, code, error: error.message }, 'error');
      res.status(500).send({
        error: {
          message: error.message,
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
    this.log.save('check-phone-code', { phone: user.phone, code: code }, 'info');

    if (!code) {
      this.log.save('check-phone-confirmation-code-params-not-defined', { phone: user.phone, code }, 'error');
      res.status(400).send('Phone confirmation code should be defined.');
      return;
    }

    try {
      const confirm = await this.service('auth').getValidConfirmCode({
        phone: user.phone,
        code,
      });

      if (!confirm) {
        const counter = await this.service('auth').incrementConfirmCodeCounterAsync({ phone: user.phone });
        this.log.save('confirm-phone-code-counter-incremented', { phone: user.phone, counter }, 'warn');
        res.send({ success: false, error: 'code not valid' });
        return;
      }

      await this.service('auth').removeConfirmCode({ phone: user.phone });
      await saveSession(req, { ...req.session.passport?.user, phoneChecked: true });
      res.send({ success: true });
    } catch (error: any) {
      this.log.save('check-phone-confirmation-code-error', { phone: user.phone, code, error: error.message }, 'error');
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
