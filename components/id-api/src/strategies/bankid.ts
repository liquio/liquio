import nodeRSA from 'node-rsa';

import { Log } from '../lib/log';
import { convertAllEscapes } from '../lib/string_converter';
import { Models } from '../models';
import { UserServicesCreationAttributes } from '../models/user_services.model';
import { Services } from '../services';
import { CallbackFn, Express, Request } from '../types';
import { BankIDStrategy } from './passport_libs/passport-bankid/strategy';

/**
 * @deprecated
 */
export async function bankid(app: Express) {
  const log = Log.get();
  let passport = app.passport;
  let fs = require('fs');
  let path = require('path');
  const config = app.config.auth_providers?.bankid;
  if (!config) {
    throw new Error("'bankid' provider is not configured");
  }
  if (!fs.existsSync(config.privateKey)) {
    throw new Error(`Private key file not found: ${config.privateKey}`);
  }

  const privateKey = new nodeRSA(fs.readFileSync(path.resolve(config.privateKey)));
  privateKey.setOptions({ encryptionScheme: 'pkcs1' });

  passport.mapping['bankid'] = {
    first_name: 'firstName',
    last_name: 'lastName',
    middle_name: 'middleName',
    gender: 'sex',
    email: 'email',
    birthday: 'birthDay',
  };

  passport.normalization['bankid'] = {
    gender: (gender: string) => {
      let normalizedGender = '';
      if (gender === 'M') {
        normalizedGender = 'male';
      } else if (gender === 'F') {
        normalizedGender = 'female';
      }
      return normalizedGender;
    },
    birthday: (birthday: string) => {
      return (birthday || '').replace(/\./gi, '/');
    },
  };

  passport.valid['bankid'] = ['last_name', 'first_name', 'middle_name', 'gender', 'birthday'];

  async function verify(req: Request, accessToken: string, refreshToken: string, profile: Record<string, any>, done: CallbackFn) {
    const profileDecrypt = decryptProfile(privateKey, profile);

    log.save('user-authorize-by-bankId', { profileDecrypt }, 'info');
    let saveUserQuery: UserServicesCreationAttributes = {
      userId: '',
      data: profileDecrypt,
      provider: 'bankid',
      provider_id: profileDecrypt.clId,
    };

    if (req.isAuthenticated()) {
      const service = await Models.model('userServices')
        .findOne({
          where: {
            provider: 'bankid',
            provider_id: profileDecrypt.clId,
          },
        })
        .then((row) => row?.dataValues);

      if (service) {
        if (req.session.client_requirements?.length) {
          req.user.provider = 'bankid';
        } else {
          req.flash!('services_error', 'bankid');
        }
        done(null, req.user);
      } else {
        saveUserQuery.userId = req.user.userId;
        await Models.model('userServices').upsert(saveUserQuery);
        const user = await Models.model('user')
          .findOne({
            include: [
              {
                model: Models.model('userServices'),
                where: {
                  provider: 'bankid',
                  provider_id: profileDecrypt.clId,
                },
              },
            ],
          })
          .then((row) => row?.dataValues);
        done(null, user);
      }
    } else {
      const user = await Models.model('user')
        .findOne({
          include: [
            {
              model: Models.model('userServices'),
              where: {
                provider: 'bankid',
                provider_id: profileDecrypt.clId,
              },
            },
          ],
        })
        .then((row) => row?.dataValues);
      if (user) {
        await Services.service('auth').updateUser({ userId: user.userId }, { provider: 'bankid' });
        done(null, user);
      } else {
        let user = {
          user_id: profileDecrypt.clId,
          services: { bankid: profileDecrypt },
          cached: true,
          provider: 'bankid',
        };
        Models.cache.set(user.user_id, user);
        done(null, user);
      }
    }
  }

  passport.use(new BankIDStrategy(config, verify));
}

function decryptCell(privateKey: nodeRSA, cell: string) {
  let decryptedCell = privateKey.decrypt(cell, 'utf8');
  if (decryptedCell) {
    decryptedCell = convertAllEscapes(decryptedCell, 'none');
  }
  return decryptedCell;
}

export function decryptProfile(privateKey: nodeRSA, profile: Record<string, any>) {
  const profileDecrypt: Record<string, any> = {};

  for (const k in profile) {
    if (k != 'type' && k != 'signature' && k != 'addresses') {
      profileDecrypt[k] = decryptCell(privateKey, profile[k]);
    }
  }

  if (profile.addresses) {
    profileDecrypt.addresses = [];
    for (const e in profile.addresses) {
      profileDecrypt.addresses[e] = {};
      for (const a in profile.addresses[e]) {
        if (a != 'type') {
          profileDecrypt.addresses[e][a] = decryptCell(privateKey, profile.addresses[e][a]);
        }
      }
    }
  }

  return profileDecrypt;
}
