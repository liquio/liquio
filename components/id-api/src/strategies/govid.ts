import { matchedData, query } from 'express-validator';
import { FindOptions } from 'sequelize';

import { Log } from '../lib/log';
import { saveSession } from '../middleware/session';
import { Models, UserAttributes, UserServicesCreationAttributes } from '../models';
import { Services } from '../services';
import { CallbackFn, Express, Request, Response } from '../types';
import { GovIdStrategy } from './passport_libs/passport-govid/strategy';

// Constants.
const EDRPOU_TYPE = 'edrpou';
const IPN_TYPE = 'ipn';
const PASSPORT_TYPE = 'passport';
const ID_CARD_TYPE = 'idCard';

let strategy: GovIdStrategy;
export function getStrategy(): GovIdStrategy {
  if (!strategy) {
    throw new Error('GovId strategy is not initialized.');
  }
  return strategy;
}

export async function govid(app: Express) {
  const log = Log.get();
  const passport = app.passport;
  const config = app.config;

  // Params.
  const { govid: govidConfig } = config.auth_providers || {};

  /**
   * Verify user profile.
   * @param {object} app HTTP server app.
   */
  function verifyUserProfile(_app: Express) {
    return async (req: Request, userInfo: Record<string, any>, callback: CallbackFn): Promise<any> => {
      const { ipn, surname } = userInfo || {};
      let code = ipn.DRFO ?? ipn.EDRPOU;

      if (!code) {
        log.save('user-auth-by-govid|invalid-ipn', { userInfo }, 'error');
        return callback(new Error('DRFO or EDRPOU does not exist.'));
      }

      if (!/^\d{9,10}$/.test(code) && !/^[А-Яа-я]{2}\d{6}$/.test(code)) {
        const error = new Error('DRFO or EDRPOU has an invalid format.');
        (error as any).details = code;
        log.save('user-auth-by-govid|invalid-ipn', { userInfo, error }, 'error');
        return callback(error);
      }

      if (!surname) {
        log.save('user-auth-by-govid|invalid-surname', { userInfo }, 'error');
        return callback(new Error('Surname does not exist.'));
      }

      if (config.eds?.onlyLegalEntityAllow && ipn.EDRPOU && !ipn.DRFO) {
        log.save('user-auth-by-govid|only-legal-entity', { userInfo }, 'error');
        return callback(new Error('Only legal entity allowed.'));
      }

      const findUserOptions = {
        include: [
          {
            model: Models.model('userServices'),
            where: { /*provider: 'eds',*/ provider_id: code },
          },
        ],
      };

      const userServiceAttributes: UserServicesCreationAttributes = {
        userId: '',
        data: userInfo,
        provider: 'govid',
        provider_id: code,
      };

      if (req.isAuthenticated() && req.user.userId) {
        try {
          const user = handleAuthenticated(req, findUserOptions, userServiceAttributes);
          return callback(null, user);
        } catch (error: any) {
          log.save('user-auth-by-govid|handle-authenticated-error', { error }, 'error');
          return callback(error);
        }
      }

      try {
        const existingUser = await handleExistingUser(findUserOptions, userServiceAttributes);
        if (existingUser) {
          return callback(null, existingUser);
        }
      } catch (error: any) {
        log.save('user-auth-by-govid|handle-existing-user-error', { error }, 'error');
        return callback(error);
      }

      const user = {
        user_id: code,
        services: { govid: userInfo },
        cached: true,
        provider: 'govid',
      };
      Models.cache.set(user.user_id, user);
      return callback(null, user);
    };
  }

  async function handleAuthenticated(req: Request, searchUserCriteria: FindOptions, userServiceAttributes: UserServicesCreationAttributes) {
    // Check signer code not the same as authenticated.
    if (req.user!.ipn !== userServiceAttributes.provider_id) {
      throw new Error('DRFO or EDRPOU not the same as authenticated.');
    }

    // Handle.
    const service = await Models.model('userServices')
      .findOne({ where: { provider: 'govid', provider_id: userServiceAttributes.provider_id } })
      .then((row) => row?.dataValues);
    if (service) {
      if (req.session?.client_requirements?.length) {
        req.user!.provider = 'govid';
      } else {
        req.flash!('services_error', 'govid');
      }
      return req.user;
    }

    userServiceAttributes.userId = req.user!.userId;

    await Models.model('userServices').update(userServiceAttributes, {
      where: { userId: req.user!.userId /*, provider: 'govid'*/ },
    });

    return Models.model('user')
      .findOne(searchUserCriteria)
      .then((row) => row?.dataValues);
  }

  async function handleExistingUser(findUserOptions: FindOptions, userServiceAttributes: UserServicesCreationAttributes) {
    const existingUser = await Models.model('user')
      .findOne(findUserOptions)
      .then((row) => row?.dataValues);
    if (existingUser) {
      userServiceAttributes.userId = existingUser.userId;

      let userUpdateData: Partial<UserAttributes> = { provider: 'govid' };
      const userInfo = userServiceAttributes.data as Record<string, any>;
      if (userInfo.givenName && !existingUser.lockUserInfo) {
        const nameParts = userInfo.givenName.split(' ');

        userUpdateData = {
          ...userUpdateData,
          first_name: nameParts.shift(),
          last_name: userInfo.surname,
          middle_name: nameParts.length > 0 ? nameParts.join(' ') : '',
          companyName: userInfo.organizationName,
          companyUnit: userInfo.organizationalUnitName,
          edrpou: userInfo.normalizedIpn?.EDRPOU ?? null,
        };
      }

      await Models.model('userServices').update(userServiceAttributes, {
        where: { userId: existingUser.userId /*, provider: 'govid'*/ },
      });

      return Services.service('auth').updateUser({ userId: existingUser.userId }, userUpdateData);
    }
  }

  passport.mapping['govid'] = {
    first_name: 'firstName',
    middle_name: 'middleName',
    last_name: 'lastName',
    edrpou: 'normalizedIpn',
    ipn: 'normalizedIpn',
    companyName: 'organizationName',
    companyUnit: 'organizationalUnitName',
    isLegal: 'normalizedIpn',
    isIndividualEntrepreneur: 'normalizedIpn',
    userIdentificationType: 'normalizedIpn',
  };

  passport.normalization['govid'] = {
    first_name: (first_name: string) => {
      return first_name || '';
    },
    middle_name: (middle_name: string) => {
      return middle_name || '';
    },
    last_name: (last_name: string) => {
      return last_name || '';
    },
    edrpou: ({ EDRPOU }: { DRFO?: string; EDRPOU?: string }) => EDRPOU,
    ipn: ({ DRFO, EDRPOU }: { DRFO?: string; EDRPOU?: string }) => DRFO ?? EDRPOU,
    isLegal: ({ DRFO, EDRPOU }: { DRFO?: string; EDRPOU?: string }) => !!(EDRPOU && !DRFO) && EDRPOU.length !== 10,
    isIndividualEntrepreneur: ({ DRFO, EDRPOU }: { DRFO?: string; EDRPOU?: string }) => EDRPOU && EDRPOU.length === 10 && (!DRFO || DRFO === EDRPOU),
    userIdentificationType: ({ DRFO, EDRPOU }: { DRFO?: string; EDRPOU?: string }) => {
      if (EDRPOU && !DRFO) {
        return EDRPOU_TYPE;
      } else if (!DRFO) {
        return undefined;
      } else {
        const ipnRegex = /^\\d{10}$/;
        const passportRegex = /^[A-Za-zА-Яа-я]{2}\\d{6}$/;
        const idCardRegex = /^\\d{9}$/;
        let identificationType;
        if (ipnRegex.test(DRFO)) {
          identificationType = IPN_TYPE;
        } else if (passportRegex.test(DRFO)) {
          identificationType = PASSPORT_TYPE;
        } else if (idCardRegex.test(DRFO)) {
          identificationType = ID_CARD_TYPE;
        } else {
          identificationType = undefined;
        }
        return identificationType;
      }
    },
  };

  passport.valid['govid'] = [
    'last_name',
    'first_name',
    'middle_name',
    'edrpou',
    'ipn',
    'companyName',
    'companyUnit',
    'isLegal',
    'isIndividualEntrepreneur',
    'userIdentificationType',
  ];

  strategy = new GovIdStrategy(govidConfig!, verifyUserProfile(app) as any);
  passport.use(strategy);

  // Route to auth user.
  app.post(
    '/authorise/govid',
    passport.authenticate('govid', {
      failureRedirect: '/sign_in',
      keepSessionInfo: true,
    }),
    async (req, res) => {
      const user = req.session.passport?.user;

      log.save('user-auth-by-govid', { user }, 'info');

      await saveSession(req, user);

      res.send({ error: null, redirect: '/authorise/continue/' });
    },
  );

  // Route to get Gov ID auth info.
  app.get('/authorise/govid/info', [
    query('state').optional().isString(),
    async (req: Request, res: Response) => {
      const { authorizationUrl, clientId, redirectUrl, authType } = govidConfig as any;
      const { state = 'null' } = matchedData(req, { locations: ['query'] });

      let authTypeString = 'dig_sign,bank_id,mobile_id,diia_id';
      if (Array.isArray(authType)) {
        authTypeString = authType.join(',');
      }

      const url = new URL(authorizationUrl);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('auth_type', authTypeString);
      url.searchParams.set('state', state);
      url.searchParams.set('redirect_uri', redirectUrl);

      res.send({
        authorizationUrl,
        clientId,
        redirectUrl,
        totalAuthUrl: url.toString(),
      });
    },
  ]);
}
