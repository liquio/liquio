import axios from 'axios';
import passport from 'passport';
import OAuth2Strategy, { VerifyCallback } from 'passport-oauth2';
import { Log } from '@liquio/back-core';

import { calculateUserCode } from '../lib/calculate_user_code';
import { Models } from '../models';
import { Services } from '../services';
import { clearTwoFactorState } from '../lib/two_factor';
import { Express, NextFunction, Request, Response } from '../types';

export function usePassport(express: Express) {
  const log = Log.getInstance();

  express.passport = passport as any;
  express.passport.mapping = {};
  express.passport.valid = {};
  express.passport.normalization = {};

  express.use(passport.initialize());
  express.use(passport.session());

  // Every new primary authentication (any strategy) goes through `req.logIn`.
  // Reset the second factor state there, so a completion proof of a previous login can never be reused.
  express.use((req: Request, res: Response, next: NextFunction) => {
    const logIn = req.logIn;
    const resetAndLogIn = function (this: Request, ...args: any[]) {
      clearTwoFactorState(this);
      return (logIn as any).apply(this, args);
    };
    req.logIn = resetAndLogIn as any;
    req.login = resetAndLogIn as any;
    next();
  });

  passport.serializeUser(function (user: any, done) {
    if (user?.cached) {
      done(null, Models.cache.get(user.user_id));
    } else if (!user) {
      done(new Error('Attempted to serialize undefined user data'), null);
    } else {
      done(null, user);
    }
  });

  passport.deserializeUser(function (user: any, done) {
    if (user?.cached) {
      const value = Models.cache.get<Express.User>(user.user_id);
      if (value) {
        done(null, value);
      } else {
        Models.cache.set(user.user_id, user);
        done(null, user);
      }
    } else if (!user) {
      done(new Error('Attempted to deserialize undefined user data'), null);
    } else {
      Services.service('auth')
        .getUser({ userId: user.userId })
        .then((user: any) => {
          done(null, user);
        })
        .catch((error: any) => {
          log.save('passport-deserialize-user', { error }, 'error');
          done(error);
        });
    }
  });

  if (express.config.auth_providers?.oauth2) {
    const config = express.config.auth_providers.oauth2;
    passport.use(
      new OAuth2Strategy(config, (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => {
        log.save('user-auth-by-oauth2', { profileId: profile?.id }, 'info');
        axios
          .get(config.userProfileUrl + '?access_token=' + accessToken)
          .then(async (response) => {
            log.save('user-auth-by-oauth2', { status: response.status }, 'info');
            const userData = response.data;

            const userCode = calculateUserCode(userData.ipn, userData.edrpou);

            let user = await Models.model('user')
              .findOne({ where: { ipn: userCode } })
              .then((row) => row?.dataValues);

            if (!user) {
              try {
                user = await Models.model('user')
                  .create(
                    {
                      ipn: userCode,
                      edrpou: userData.edrpou,
                      role: userData.role,
                      companyName: userData.companyName,
                      isLegal: userData.isLegal,
                      isIndividualEntrepreneur: userData.isIndividualEntrepreneur,
                      legalEntityDateRegistration: userData.legalEntityDateRegistration,
                      address: userData.address,
                      first_name: userData.first_name,
                      middle_name: userData.middle_name,
                      last_name: userData.last_name,
                      email: userData.email,
                      gender: userData.gender,
                      phone: userData.phone,
                      status: userData.status,
                      avaUrl: userData.avaUrl,
                      birthday: userData.birthday,
                      valid: userData.valid,
                    },
                    { returning: true },
                  )
                  .then((row) => row?.dataValues);
              } catch (error) {
                log.save('user-auth-by-oauth2', { error: (error as any)?.message }, 'error');
                done(error);
                return;
              }
            }

            done(null, user as any);
          })
          .catch((error) => {
            log.save('user-auth-by-oauth2', { error: (error as any)?.message }, 'error');
            done(error);
          });
      }),
    );

    express.get('/authorise/oauth2', passport.authenticate('oauth2'));
    express.get(
      '/authorise/oauth2/callback',
      passport.authenticate('oauth2', {
        failureRedirect: '/',
        keepSessionInfo: true,
      }),
      (req, res) => {
        log.save('user-auth-by-oauth2', { userId: (req.session.passport?.user as any)?.userId ?? (req.session.passport?.user as any)?.id }, 'info');
        req.session.save(() => setTimeout(() => res.redirect('/authorise/continue/'), 250));
      },
    );
  }
}
