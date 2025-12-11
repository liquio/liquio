import { Strategy } from 'passport-oauth2';
import axios from 'axios';

import { CallbackFn, Express } from '../types';
import { Log } from '../lib/log';
import { Models, UserAttributes } from '../models';

export async function wso2(app: Express) {
  const log = Log.get();
  const passport = app.passport;

  const { isEnabled, baseURL, clientID, clientSecret, callbackURL } = app.config?.auth_providers?.wso2 ?? {};

  if (!isEnabled) {
    log.save('wso2', { status: 'disabled' }, 'info');
    return;
  }

  // Fetch OAuth2 metadata from a well-known endpoint
  let authorizationURL, tokenURL, userInfoURL;
  try {
    const { data } = await axios({
      method: 'GET',
      url: `${baseURL}/.well-known/openid-configuration`,
    });

    authorizationURL = data.authorization_endpoint;
    tokenURL = data.token_endpoint;
    userInfoURL = data.userinfo_endpoint;

    log.save('wso2|oauth2-metadata', { ...data }, 'info');
  } catch (error: any) {
    const response = error.response?.data;
    log.save('wso2|init', { status: 'error', error, response }, 'info');
    return;
  }

  // Define OAuth2 strategy
  passport.use(
    'wso2',
    new Strategy(
      {
        authorizationURL,
        tokenURL,
        clientID,
        clientSecret,
        callbackURL,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: CallbackFn) => {
        let userInfo;

        try {
          const { data } = await axios({
            method: 'GET',
            url: userInfoURL,
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          userInfo = data;

          log.save('wso2|user-info', { status: 'success', userInfo }, 'info');
        } catch (error: any) {
          const response = error.response?.data;

          log.save('wso2|user-info-fetch-error', { error, response }, 'error');

          return done(error);
        }

        try {
          // Map user info to our schema
          const {
            sub: providerId,
            itin: ipn,
            organization_edrpou: edrpou,
            email,
            phone_number: phone,
            organization_name: companyName,
            given_name: first_name,
            family_name: last_name,
            middle_name,
          } = userInfo;

          // Find or create the user in the database
          const existingUser = await Models.model('user')
            .findOne({ where: { ipn } })
            .then((row) => row?.dataValues);

          let newUser: UserAttributes;
          if (!existingUser) {
            newUser = await Models.model('user')
              .create(
                {
                  ipn,
                  edrpou,
                  email,
                  phone,
                  companyName,
                  first_name,
                  last_name,
                  middle_name,
                },
                { returning: true },
              )
              .then((row) => row.dataValues);
          }

          const userService = await Models.model('userServices').upsert({
            userId: (existingUser || newUser!).userId,
            provider: 'wso2',
            provider_id: providerId,
            data: userInfo,
          });

          const session = {
            ...(existingUser || newUser!),
            provider: 'wso2',
            services: { wso2: userService },
          };

          log.save('wso2|user-authorized', { userId: (existingUser || newUser!).userId }, 'info');

          done(null, session);
        } catch (error: any) {
          log.save('wso2|user-info-error', { error: `${error}` }, 'error');

          done(error);
        }
      },
    ),
  );

  // Route for the frontend to navigate to for a redirect to WSO2 authorisation URL
  app.get('/authorise/wso2', passport.authenticate('wso2'));

  // Route to receive a callback from the external provider
  app.get('/authorise/wso2/callback', passport.authenticate('wso2', { failureRedirect: '/login', keepSessionInfo: true }), async (req, res) => {
    req.session.save();

    await new Promise((resolve) => setTimeout(resolve, 250));

    log.save('wso2|callback', { isAuthenticated: req.isAuthenticated(), userId: req.user!.userId }, 'info');

    res.redirect('/authorise/continue');
  });

  log.save('wso2|init', { status: 'initialized' }, 'info');
}
