import axios from 'axios';
import passport from 'passport';
import OAuth2Strategy, { VerifyCallback } from 'passport-oauth2';

import { calculateUserCode } from '../lib/calculate_user_code';
import { Log } from '../lib/log';
import { Models } from '../models';
import { Services } from '../services';
import { Express } from '../types';

export function usePassport(express: Express) {
  const log = Log.get();

  express.passport = passport as any;
  express.passport.mapping = {};
  express.passport.valid = {};
  express.passport.normalization = {};

  express.use(passport.initialize());
  express.use(passport.session());

  passport.serializeUser(function (user: any, done) {
    if (user?.cached) {
      Models.cache.get(user.user_id, function (err: Error, value: any) {
        if (!err) {
          done(null, value);
        }
      });
    } else if (!user) {
      done(new Error('Attempted to serialize undefined user data'), null);
    } else {
      done(null, user);
    }
  });

  passport.deserializeUser(function (user: any, done) {
    if (user?.cached) {
      Models.cache.get(user.user_id, function (err, value: any) {
        if (!err && Boolean(value)) {
          done(null, value);
        } else {
          Models.cache.set(user.user_id, user);
          done(null, user);
        }
      });
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
        log.save('user-auth-by-oauth2', { accessToken, refreshToken, profile }, 'info');
        axios
          .get(config.userProfileUrl + '?access_token=' + accessToken)
          .then(async (response) => {
            log.save('user-auth-by-oauth2', { response: response.data }, 'info');
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
                log.save('user-auth-by-oauth2', { error }, 'error');
                done(error);
                return;
              }
            }

            done(null, user as any);
          })
          .catch((error) => {
            log.save('user-auth-by-oauth2', { error }, 'error');
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
        log.save('user-auth-by-oauth2', { user: req.session.passport?.user }, 'info');
        req.session.save(() => setTimeout(() => res.redirect('/authorise/continue/'), 250));
      },
    );
  }
}
