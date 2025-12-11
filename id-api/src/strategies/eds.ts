import { FindOptions } from 'sequelize';

import { calculateUserCode } from '../lib/calculate_user_code';
import { Log } from '../lib/log';
import { saveSession } from '../middleware/session';
import { Models, UserAttributes, UserCreationAttributes, UserServicesCreationAttributes } from '../models';
import { Services } from '../services';
import { CallbackFn, Express, Request, Response } from '../types';
import { EDSStrategy } from './passport_libs/passport-eds/strategy';

export async function eds(app: Express) {
  const log = Log.get();
  const passport = app.passport;

  passport.mapping['eds'] = {
    first_name: 'givenName',
    last_name: 'surname',
    middle_name: 'givenName',
    edrpou: 'normalizedIpn',
    ipn: 'normalizedIpn',
    companyName: 'organizationName',
    companyUnit: 'organizationalUnitName',
    isLegal: 'normalizedIpn',
    isIndividualEntrepreneur: 'normalizedIpn',
    userIdentificationType: 'normalizedIpn',
  };

  passport.normalization['eds'] = {
    first_name: (first_name: string) => {
      if (!first_name) {
        return '';
      }
      const parts = first_name.split(' ');
      return parts.length === 2 ? parts.shift() : parts.join(' ');
    },
    middle_name: (middle_name: string) => {
      if (!middle_name) {
        return '';
      }
      const parts = middle_name.split(' ');
      return parts.length === 2 ? parts.pop() : '';
    },
    edrpou: ({ EDRPOU }: { DRFO?: string; EDRPOU?: string }) => EDRPOU,
    ipn: ({ DRFO, EDRPOU }: { DRFO?: string; EDRPOU?: string }) => DRFO ?? EDRPOU,
    isLegal: Services.service('eds').isLegal,
    isIndividualEntrepreneur: Services.service('eds').isIndividualEntrepreneur,
    userIdentificationType: Services.service('eds').getUserIdentificationType,
  };

  passport.valid['eds'] = [
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

  function verifyUserProfile(app: Express) {
    return async (req: Request, signer: Record<string, any>, callback: CallbackFn): Promise<void> => {
      const { ipn: ipnObj, surname } = signer || {};
      const { DRFO: ipn, EDRPOU: edrpou } = ipnObj;

      if (!ipn) {
        const error = new Error('Ipn does not exist.');
        (error as any).details = surname;
        throw error;
      }

      if (!/^\d{9,10}$/.test(ipn) && !/^[А-Яа-я]{2}\d{6}$/.test(ipn)) {
        const error = new Error('Ipn has an invalid format.');
        (error as any).details = ipn;
        throw error;
      }

      if (!surname) {
        const error = new Error('Surname does not exist.');
        (error as any).details = ipn;
        throw error;
      }

      if (app.config.eds?.onlyLegalEntityAllow && ipn.EDRPOU && !ipn.DRFO) {
        throw new Error('Only legal entity allowed.');
      }

      const userCode = calculateUserCode(ipn, edrpou);

      const findUserOptions: FindOptions<UserAttributes> = {
        include: [
          {
            model: Models.model('userServices'),
            where: { /*provider: 'eds',*/ provider_id: userCode }, // TODO: Check if provider is needed.
          },
        ],
      };

      const userServiceAttributes: UserServicesCreationAttributes = {
        userId: '',
        data: signer,
        provider: 'eds',
        provider_id: userCode,
      };

      if (req.isAuthenticated() && req.user.userId) {
        return callback(null, handleAuthenticated(req, findUserOptions, userServiceAttributes));
      }

      const existingUser = await handleExistingUser(findUserOptions, userServiceAttributes);
      if (existingUser) {
        return callback(null, existingUser);
      }

      const user = {
        user_id: userCode,
        services: { eds: signer },
        cached: true,
        provider: 'eds',
      };
      Models.cache.set(user.user_id, user);
      callback(null, user);
    };
  }

  async function handleAuthenticated(req: Request, findUserOptions: FindOptions, userServiceAttributes: UserServicesCreationAttributes) {
    // Check signer code not the same as authenticated.
    const reqUserCode = calculateUserCode(req.user!.ipn, req.user!.edrpou);
    if (reqUserCode !== userServiceAttributes.provider_id) {
      throw new Error('DRFO or EDRPOU not the same as authenticated.');
    }

    const service = await Models.model('userServices')
      .findOne({
        where: { provider: 'eds', provider_id: userServiceAttributes.provider_id },
      })
      .then((row) => row?.dataValues);

    if (service) {
      if ('client_requirements' in req.session && req.session.client_requirements?.length) {
        req.user!.provider = 'eds';
      } else {
        req.flash!('services_error', 'eds');
      }
      return req.user!;
    }

    userServiceAttributes.userId = req.user!.userId;
    await Models.model('userServices').update(userServiceAttributes, {
      where: { userId: req.user!.userId /*, provider: 'eds'*/ },
    });
    return Models.model('user').findOne(findUserOptions);
  }

  async function handleExistingUser(findUserOptions: FindOptions, userServiceAttributes: UserServicesCreationAttributes) {
    const existingUser = await Models.model('user')
      .findOne(findUserOptions)
      .then((row) => row?.dataValues);

    if (existingUser) {
      userServiceAttributes.userId = existingUser.userId;

      let userUpdateData: UserCreationAttributes = { provider: 'eds' };
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
          isLegal: userInfo.normalizedIpn && Services.service('eds').isLegal(userInfo.normalizedIpn),
          isIndividualEntrepreneur: userInfo.normalizedIpn && Services.service('eds').isIndividualEntrepreneur(userInfo.normalizedIpn),
          userIdentificationType: userInfo.normalizedIpn && Services.service('eds').getUserIdentificationType(userInfo.normalizedIpn),
        };
      }

      await Models.model('userServices').update(userServiceAttributes, {
        where: { userId: existingUser.userId /*, provider: 'eds'*/ },
      });

      return Services.service('auth').updateUser({ userId: existingUser.userId }, userUpdateData);
    }
  }

  passport.use(new EDSStrategy(app.config.auth_providers?.eds, verifyUserProfile(app) as any));

  app.post(
    '/authorise/eds',
    passport.authenticate('eds', {
      failureRedirect: '/sign_in',
      keepSessionInfo: true,
    }),
    async (req, res) => {
      log.save('user-success-authorize-by-eds', { userPassportData: req.session.passport?.user }, 'info');
      await saveSession(req);
      if (!res.headersSent) {
        res.send({ error: null, redirect: '/authorise/continue/' });
      }
    },
  );

  app.get('/authorise/eds/sign', (req: Request, res: Response) => {
    Services.service('eds')
      .getRandomContentToSign()
      .then((token: string) => {
        res.send({ token });
      })
      .catch((error: Error) => {
        res.status(500).send({ error: error.message });
      });
  });
}
