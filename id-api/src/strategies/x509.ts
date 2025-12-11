import { Strategy as PassportStrategy } from 'passport-strategy';

import { Log } from '../lib/log';
import { Express, Request, Response } from '../types';
import { saveSession } from '../middleware/session';
import { SignatureInfoSigner, X509Service } from '../services/x509.service';
import { Services } from '../services';
import { Helpers } from '../lib/helpers';
import { Models, UserAttributes, UserServicesAttributes } from '../models';

export interface X509StrategyOptions {
  passReqToCallback?: boolean;
}

export type X509VerifyFunction = (req: Request, userInfo: SignatureInfoSigner, done: (error: any, user?: any, info?: any) => void) => void;

/**
 * X509Strategy for Passport that authenticates users based on PKCS#7 (CMS) certificate data.
 * Expects a base64-encoded PKCS#7 in req.body.pkcs7.
 * Extracts eIDAS fields from the certificate subject.
 */
export class X509Strategy extends PassportStrategy {
  name = 'x509';
  private readonly verify: X509VerifyFunction;
  private readonly x509Service: X509Service;
  private readonly log: Log;

  constructor(options: X509StrategyOptions, verify: X509VerifyFunction) {
    super();
    this.verify = verify;
    this.x509Service = Services.service('x509');
    this.log = Log.get();
  }

  async authenticate(req: Request) {
    try {
      const signatureInfo = await this.x509Service.getSignatureInfo(req.body.pkcs7);
      if (!signatureInfo) {
        this.log.save('x509-strategy|authenticate|invalid-pkcs7', { pkcs7: Helpers.shorten(req.body.pkcs7) }, 'error');
        return this.fail({ message: 'Invalid PKCS#7 structure' }, 400);
      }

      // Build user info object
      const userInfo = signatureInfo.subject;

      // Call verify callback
      const verified = (error: any, user?: any, info?: any) => {
        if (error) {
          this.log.save('x509-strategy|authenticate|error', Helpers.processError(error), 'error');
          return this.error(error);
        }

        if (!user) {
          this.log.save('x509-strategy|authenticate|no-user', { info }, 'error');
          return this.fail(info, 401);
        }

        this.success(user, info);
      };

      this.verify(req, userInfo, verified);
    } catch (error: any) {
      const processedError = Helpers.processError(error);
      this.log.save('x509-strategy|authenticate|error', processedError, 'error');
      if (error && error.status === 400) {
        return this.fail(processedError.error, 400);
      }
      this.error(error);
    }
  }
}

export async function x509(app: Express) {
  const log = Log.get();

  if (!app.config.auth_providers.x509?.isEnabled) {
    log.save('x509-strategy', { status: 'disabled' }, 'info');
    return;
  }

  const passport = app.passport;

  passport.valid['x509'] = ['last_name', 'first_name', 'edrpou', 'ipn', 'companyName'];

  passport.use(
    'x509',
    new X509Strategy({}, async (req, userInfo, done) => {
      log.save('x509-strategy|authenticate|verify', { user: userInfo }, 'info');

      const ipn = userInfo.serialNumber || userInfo.personIdentifier;
      if (!ipn) {
        log.save('x509-strategy|authenticate|no-user-id', { userInfo }, 'error');
        return done(new Error('No user ID found in certificate'));
      }

      // Find user by email
      const existingUser = await Models.model('user')
        .findOne({
          where: { ipn },
          include: [{ model: Models.model('userServices') }],
        })
        .then((row) => row?.dataValues as UserAttributes & { user_services: UserServicesAttributes[] });

      let newUser: UserAttributes;
      if (!existingUser) {
        let givenName = userInfo.givenName || '';
        let surname = userInfo.surname || '';
        let middleName = userInfo.middleName || '';

        // Handle givenName and surname naively if not provided
        if (!userInfo.givenName && userInfo.commonName) {
          const nameParts = userInfo.commonName.split(' ');
          givenName = nameParts[0];
          surname = nameParts[nameParts.length - 1];
          if (nameParts.length > 2) {
            middleName = nameParts.slice(1, -1).join(' ');
          }
        }

        // Create a new user if not found
        newUser = await Models.model('user')
          .create(
            {
              first_name: givenName,
              last_name: surname,
              middle_name: middleName,
              ipn,
            },
            { returning: true },
          )
          .then((row) => row.dataValues);

        log.save('x509-strategy|authenticate|user-created', { userId: newUser.userId }, 'info');
      } else {
        await Models.model('user').update(
          {
            first_name: userInfo.givenName || existingUser.first_name,
            last_name: userInfo.surname || existingUser.last_name,
            middle_name: userInfo.middleName || existingUser.middle_name,
          },
          { where: { userId: existingUser.userId } },
        );

        log.save('x509-strategy|authenticate|user-found', { userId: existingUser.userId }, 'info');
      }

      const userService = await Models.model('userServices').upsert({
        userId: (existingUser || newUser!).userId,
        provider: 'x509',
        provider_id: ipn,
        data: userInfo,
      });

      done(null, {
        ...(existingUser || newUser!),
        provider: 'x509',
        services: { x509: userService },
      });
    }),
  );

  app.passport.mapping['x509'] = {
    userIdentificationType: 'ipn',
  };

  app.post('/authorise/x509', passport.authenticate('x509', { keepSessionInfo: true }), async (req: Request, res: Response) => {
    log.save('x509-strategy|authorise|success', { user: Helpers.shorten(JSON.stringify(req.user)) }, 'info');
    await saveSession(req, req.user);
    res.send({ error: null, redirect: '/authorise/continue/' });
  });

  log.save('x509-strategy', { status: 'initialized' }, 'info');
}
