import passport from 'passport';
import querystring from 'querystring';
import axios from 'axios';
import crypto from 'crypto';

import { CallbackFn, Request } from '../../../types';
import { Config } from '../../../config';

const sha1 = (text: string) => {
  return crypto.createHash('sha1').update(text).digest('hex');
};

export type BankIDStrategyVerify = (req: Request, accessToken: string, refreshToken: string, profile: any, done: CallbackFn) => void;

export class BankIDStrategy extends passport.Strategy {
  public readonly options: NonNullable<Config['auth_providers']['bankid']>;
  public readonly name: string;

  private readonly verify: BankIDStrategyVerify;

  constructor(options: Config['auth_providers']['bankid'], verify: BankIDStrategyVerify) {
    super();

    this.options = options!;
    this.name = 'bankid';
    this.verify = verify;
  }

  getAccessToken(authCode: string, callback: CallbackFn) {
    const clientID = this.options.clientID;
    const clientSecret = this.options.clientSecret;
    const callbackURL = this.options.callbackURL;

    const bankIdData = {
      code: authCode,
      client_id: clientID,
      client_secret: sha1(clientID! + clientSecret + authCode),
      redirect_uri: callbackURL,
      grant_type: 'authorization_code',
    };

    axios
      .post(this.options.tokenURL!, bankIdData)
      .then((response) => {
        callback(null, response.data);
      })
      .catch((err) => {
        callback(err);
      });
  }

  getCustomerInfo(accessToken: string, callback: CallbackFn) {
    const customerData = {
      type: 'physical',
      fields: ['firstName', 'middleName', 'lastName', 'phone', 'inn', 'clId', 'clIdText', 'birthDay', 'email', 'sex'],
      addresses: [
        {
          type: 'factual',
          fields: ['country', 'state', 'area', 'city', 'street', 'houseNo', 'flatNo'],
        },
      ],
      documents: [
        {
          type: 'passport',
          fields: ['series', 'number', 'issue', 'dateIssue', 'dateExpiration', 'issueCountryIso2'],
        },
      ],
    };

    const customerHeaders = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken + ', Id ' + this.options.clientID,
      Accept: 'application/json',
    };

    axios
      .post(this.options.customerURL!, customerData, {
        headers: customerHeaders,
      })
      .then((response) => {
        callback(null, response.data);
      })
      .catch((err) => {
        callback(err);
      });
  }

  authenticate(req: Request, params?: any) {
    if (Object.keys(params).length == 0)
      return req.res!.redirect(
        this.options.authorizationURL +
          '?' +
          querystring.stringify({
            client_id: this.options.clientID,
            redirect_uri: this.options.callbackURL,
            response_type: 'code',
          }),
      );

    const code = typeof req.query.code === 'string' ? req.query.code : '';

    this.getAccessToken(code, (err: any, tokens: any) => {
      let accessToken = tokens.access_token;
      let refreshToken = tokens.refresh_token;

      this.getCustomerInfo(accessToken, (err: any, customer: any) => {
        this.verify(req, accessToken, refreshToken, customer.customer, (err: any, user: any) => {
          if (err) {
            return this.error(err);
          }
          this.success(user);
        });
      });
    });
  }
}
