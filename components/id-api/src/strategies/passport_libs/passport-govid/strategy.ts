import crypto from 'crypto';

import { fromBER, Sequence } from 'asn1js';
import axios from 'axios';
import { ContentInfo } from 'pkijs';
import { Strategy } from 'passport-strategy';
import { Log } from '@liquio/back-core';

import { Config } from '../../../config';
import { sanitizeProviderProfile } from '../../../lib/public_services';
import { Request, StrategyVerify } from '../../../types';

const NAMES_NA_LIST = ['n/a', 'n\\a'];
const STATE_TTL_MS = 10 * 60 * 1000;

type GovIdSessionState = { state: string; createdAt: number };

/**
 * Generate a random OAuth state and bind it to the browser session.
 * Any client-supplied state is ignored.
 */
export function issueGovIdState(req: Request): string {
  const state = crypto.randomBytes(32).toString('base64url');
  (req.session as any).govid = { state, createdAt: Date.now() } satisfies GovIdSessionState;
  return state;
}

/**
 * Validate the callback state against the session. The stored state is single use: it is removed on every attempt.
 */
export function consumeGovIdState(req: Request, received: unknown): boolean {
  const session = req.session as any;
  const stored: GovIdSessionState | undefined = session?.govid;
  if (session) {
    delete session.govid;
  }
  if (!stored || typeof stored.state !== 'string' || typeof received !== 'string' || !received) {
    return false;
  }
  if (!(Date.now() - stored.createdAt <= STATE_TTL_MS)) {
    return false;
  }
  const a = Buffer.from(stored.state);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Gov ID strategy.
 */
export class GovIdStrategy extends Strategy {
  private readonly log = Log.getInstance();
  private readonly timeout: number;
  private readonly options: NonNullable<Config['auth_providers']['govid']>;
  private readonly verify?: StrategyVerify;

  public readonly name = 'govid';

  constructor(options: NonNullable<Config['auth_providers']['govid']>, verify?: StrategyVerify) {
    super();
    this.options = options;
    this.verify = verify;
    this.timeout = options?.timeout ?? 20000;
  }

  /**
   * Define authentication method.
   */
  authenticate(req: Request, _options?: any): void {
    this.authenticateAsync(req).catch((error) => this.error(error));
  }

  /**
   * Authenticate.
   */
  async authenticateAsync(req: Request): Promise<void> {
    if (!this.options) {
      this.log.save('authenticate-govid|strategy-not-defined', undefined, 'error');
      req.res!.status(405).send({ error: 'Gov ID strategy not defined.' });
      return;
    }

    // Get already defined user.
    const { user } = req || {};
    const userIP = req.header('x-forwarded-for') ?? req.socket?.remoteAddress ?? 'unknownIP';

    this.log.save('authenticate-govid|start', { userId: user?.userId, userIP }, 'info');

    // Check already defined user auth type.
    if (user?.services?.govid) {
      this.log.save('authenticate-govid|authorise-continue', { userId: user?.userId }, 'info');
      req.res!.redirect('/authorise/continue/');
      return;
    }

    // Get user code.
    const { code } = req.body;
    if (!code) {
      return this.handleMissingCode(req, userIP);
    }

    // Bind the callback to the session that started the login (login CSRF protection).
    if (!consumeGovIdState(req, req.body.state)) {
      this.log.save('authenticate-govid|invalid-state', { userIP }, 'error');
      req.res!.status(400).send({ error: 'Invalid or expired state.' });
      return;
    }

    const govidTokens = await this.obtainGovidTokens(userIP, code);

    // Define Gov ID access token and user ID.
    const url = this.generateAuthorizationUrl(govidTokens);

    // Define Gov ID user info. URL with two-times URI-encoded cert - it's not a bug, it's GovID developers recommendation.
    let govidUserRaw;
    try {
      const response = await axios.get(url, { timeout: this.timeout });
      govidUserRaw = response.data;

      if (typeof govidUserRaw === 'string') {
        this.log.save(
          'authenticate-govid|get-user-info-error',
          {
            endpoint: 'get-user-info',
            status: response.status,
          },
          'error',
        );
        return this.error(new Error('Gov ID user not defined.'));
      } else if (!govidUserRaw || govidUserRaw.error) {
        this.log.save('authenticate-govid|get-user-info-error', { govidUserId: govidTokens.govidUserId }, 'error');
        return this.error(new Error('Gov ID user not defined.'));
      }
    } catch {
      this.log.save('authenticate-govid|govid-request-error', { error: 'GovID request failed', endpoint: 'get-user-info' }, 'error');
      return this.error(new Error('GovID request failed'));
    }

    let govidUser;
    if (govidUserRaw.encryptedUserInfo) {
      try {
        govidUser = await this.handleEncryptedUserInfo(govidUserRaw, govidTokens);
      } catch (error: any) {
        return this.error(error);
      }
    } else {
      govidUser = govidUserRaw;
    }

    // Log.
    this.log.save('authenticate-govid|user-info', { govidUserId: govidTokens.govidUserId }, 'info');

    // Define user info.
    const userInfo = this.prepareUserInfo(govidUser);

    // Log.
    this.log.save('authenticate-govid|user-info-parsed', { govidUserId: govidTokens.govidUserId }, 'info');
    this.log.save('authenticate-govid-successful', { data: true }, 'info');

    try {
      const user = await new Promise((resolve, reject) => {
        this.verify!(req, userInfo, (err, user) => (err ? reject(err) : resolve(user)));
      });
      this.success(user, null);
    } catch (error: any) {
      this.log.save('authenticate-govid|verify-error', { error: error.message }, 'error');
      req.res!.status(401).send({
        error: error.message,
        ...(error.details && { details: error.details }),
      });
    }
  }

  private generateAuthorizationUrl(govidTokens: { govidAccessToken: string; govidUserId: string }) {
    const { authorizationUrl, useEncryption, idCert } = this.options;

    let uri = new URL(`${authorizationUrl}/get-user-info`);
    uri.searchParams.set('access_token', govidTokens.govidAccessToken);
    uri.searchParams.set('user_id', govidTokens.govidUserId);
    uri.searchParams.set(
      'fields',
      'issuer,issuercn,serial,subject,subjectcn,locality,state,o,ou,title,lastname,middlename,givenname,email,address,phone,dns,edrpoucode,drfocode,documents',
    );
    if (useEncryption) {
      uri.searchParams.set('cert', idCert!);
    }
    return uri.toString();
  }

  private async handleEncryptedUserInfo(govidUserRaw: any, govidTokens: any): Promise<Record<string, any>> {
    const { encryptionServiceUrl, encryptionServiceToken } = this.options;

    this.log.save('authenticate-govid|user-info-raw', { govidUserId: govidTokens.govidUserId }, 'info');

    let govidUser;
    let decryptedRaw;
    try {
      decryptedRaw = await axios
        .post(`${encryptionServiceUrl}/decrypt`, { data: govidUserRaw.encryptedUserInfo }, { headers: { token: encryptionServiceToken } })
        .then((res) => res.data);

      if (!decryptedRaw?.data) {
        throw new Error('Can not decrypt user data.');
      }
    } catch {
      this.log.save(
        'authenticate-govid|user-info-decrypt-error',
        {
          govidUserId: govidTokens.govidUserId,
          error: 'GovID decryption failed',
        },
        'error',
      );
      throw new Error('Can not decrypt user data.');
    }

    await this.handleLogout(govidTokens);

    // Parse decrypted data.
    try {
      const decryptedData = this.decryptPayloadData(decryptedRaw.data);
      govidUser = decryptedData.govidUser;
    } catch {
      this.log.save(
        'authenticate-govid|user-info-decrypt-parsing-error',
        {
          govidUserId: govidTokens.govidUserId,
          error: 'GovID profile parsing failed',
        },
        'error',
      );
      throw new Error('Can not parse decrypted user data.');
    }

    return govidUser;
  }

  private decryptPayloadData(data: string): { decrypted?: string; govidUser: any } {
    let decrypted, govidUser;
    const rawData = Buffer.from(data, 'base64');

    // If the remote service returns a JSON string, parse it.
    if (rawData.toString('utf8').startsWith('{')) {
      govidUser = JSON.parse(rawData.toString('utf8'));

      // Try to handle the raw data as a DER blob (look at signer-hsm for details).
    } else {
      decrypted = rawData.subarray(0, 32).toString('base64');
      govidUser = this.extractJsonFromDer(rawData);
    }

    return { decrypted, govidUser };
  }

  private async handleLogout(govidTokens: { govidAccessToken: string; govidUserId: string }) {
    const { authorizationUrl } = this.options;

    try {
      const logoutResult = await axios
        .post(
          `${authorizationUrl}/get-user-logout?access_token=${govidTokens.govidAccessToken}&user_id=${govidTokens.govidUserId}`,
          {},
          { timeout: this.timeout },
        )
        .then((res) => res.data);

      this.log.save('authenticate-govid|user-logout-result', {
        govidUserId: govidTokens.govidUserId,
        success: Boolean(logoutResult),
      });
    } catch {
      this.log.save(
        'authenticate-govid|user-logout',
        {
          govidUserId: govidTokens.govidUserId,
          error: 'GovID logout failed',
        },
        'error',
      );
    }
  }

  private prepareUserInfo(govidUser: any) {
    const normalizedLastName = this.normalizeName(govidUser.lastname);
    const normalizedFirstName = this.normalizeName(govidUser.givenname);
    const normalizedMiddleName = this.normalizeName(govidUser.middlename);
    return {
      organizationName: govidUser.o,
      organizationalUnitName: govidUser.ou, // TEMPORARY
      commonName: govidUser.subjectcn,
      surname: normalizedLastName,
      givenName: `${normalizedFirstName} ${normalizedMiddleName}`.trim(),
      firstName: normalizedFirstName,
      middleName: normalizedMiddleName,
      lastName: normalizedLastName,
      localityName: govidUser.locality,
      stateOrProvinceName: govidUser.state,
      ipn: {
        DRFO: govidUser.drfocode,
        EDRPOU: govidUser.edrpoucode,
      },
      normalizedIpn: this.normalizeIpn({
        DRFO: govidUser.drfocode,
        EDRPOU: govidUser.edrpoucode,
      }),
      raw: sanitizeProviderProfile(govidUser),
    };
  }

  private handleMissingCode(req: Request, userIP: string) {
    const { authorizationUrl, clientId, redirectUrl, authType } = this.options;

    let authTypeString = 'dig_sign,bank_id,mobile_id,diia_id';
    if (Array.isArray(authType)) {
      authTypeString = authType.join(',');
    }
    const state = issueGovIdState(req);

    const totalAuthUrl = new URL(authorizationUrl!);
    totalAuthUrl.searchParams.set('response_type', 'code');
    totalAuthUrl.searchParams.set('client_id', clientId!);
    totalAuthUrl.searchParams.set('auth_type', authTypeString);
    totalAuthUrl.searchParams.set('state', state);
    totalAuthUrl.searchParams.set('redirect_uri', redirectUrl!);

    this.log.save('authenticate-govid|redirect-to-auth', { endpoint: 'redirect-to-auth', userIP }, 'info');

    req.res!.redirect(totalAuthUrl.toString());
  }

  async obtainGovidTokens(userIP: string, code: string) {
    const { authorizationUrl, clientId, clientSecret, redirectUrl } = this.options;

    let govidTokens;
    try {
      const url = new URL(`${authorizationUrl}/get-access-token`);
      url.searchParams.set('grant_type', 'authorization_code');
      url.searchParams.set('client_id', clientId!);
      url.searchParams.set('client_secret', clientSecret!);
      url.searchParams.set('code', code);
      url.searchParams.set('redirect_uri', redirectUrl!);

      const queryOptions = {
        uri: url.toString(),
        timeout: this.timeout,
      };
      this.log.save('authenticate-govid|get-access-token-query', { endpoint: 'get-access-token', timeout: this.timeout }, 'info');

      govidTokens = await axios
        .get(queryOptions.uri, {
          timeout: queryOptions.timeout,
        })
        .then((res) => res.data);
    } catch (error: any) {
      this.log.save(
        'authenticate-govid|get-access-token-error',
        {
          error: 'GovID token exchange failed',
          status: error?.response?.status,
          userIP,
        },
        'error',
      );
      throw new Error('GovID token exchange failed');
    }
    const { access_token: govidAccessToken, user_id: govidUserId } = govidTokens;

    this.log.save('authenticate-govid|govid-tokens', { govidUserId }, 'info');

    return { govidAccessToken, govidUserId };
  }

  logout(userInfo: any) {
    if (!userInfo) {
      return;
    }

    const { authorizationUrl } = this.options;
    const {
      data: { raw },
    } = userInfo;

    if (!raw) {
      return;
    }

    const { access_token, user_id } = raw;

    if (!access_token || !user_id) {
      return;
    }

    return axios
      .post(`${authorizationUrl}/get-user-logout?access_token=${access_token}&user_id=${user_id}`, {}, { timeout: this.timeout })
      .then((res) => res.data);
  }

  /**
   * Normalize IPN.
   * @private
   * @param {{DRFO: string, EDRPOU: string}} ipn IPN object.
   * @returns {{DRFO: string, EDRPOU: string}} Normalized IPN object.
   */
  normalizeIpn(ipn: { DRFO?: string; EDRPOU?: string }): {
    DRFO?: string;
    EDRPOU?: string;
  } {
    // Check if not an object.
    if (typeof ipn !== 'object') {
      return {};
    }

    // Define params.
    const { DRFO, EDRPOU } = ipn;
    const normalizedDRFO = this.normalizeCode(DRFO);
    const normalizedEDRPOU = this.normalizeCode(EDRPOU);

    // Define and return normalized IPN.
    const normalizedIpn = { DRFO: normalizedDRFO, EDRPOU: normalizedEDRPOU };
    return normalizedIpn;
  }

  /**
   * Normalize code.
   * @private
   * @param {string} code Code.
   */
  normalizeCode(code?: string) {
    // Check if not a string.
    if (typeof code !== 'string') {
      return;
    }

    // Filter chars.
    const codeArray = code.toUpperCase().split('');
    const filteredCodeArray = codeArray.filter((v) => (v >= '0' && v <= '9') || (v >= 'A' && v <= 'Z') || (v >= 'А' && v <= 'Я'));
    const filteredCode = filteredCodeArray.join('');

    // Check if empty after filters.
    if (filteredCode.length === 0) {
      return;
    }

    // Return filtered code.
    return filteredCode;
  }

  /**
   * Normalize name.
   * @param {string} name Name.
   * @returns {string} Normalized name.
   */
  normalizeName(name: string) {
    // Check if not a string.
    if (typeof name !== 'string') return '';

    // Check if N/A.
    const { namesNaList = NAMES_NA_LIST } = this.options;
    if (namesNaList.includes(name.toLowerCase().trim())) return '';

    // Return as is in other cases.
    return name;
  }

  /**
   * Extract PKCS7 payload from a DER blob.
   * @private
   * @param {Uint8Array} der DER buffer.
   * @returns {object} JSON payload.
   */
  extractJsonFromDer(der: Uint8Array) {
    const asn1 = fromBER(der);
    if (asn1.offset === -1) throw new Error('Failed to parse ASN.1 data.');

    const contentInfo = new ContentInfo({ schema: asn1.result });
    const pkcs7DataObject = this.findPKCS7DataObject(contentInfo.content);
    if (!pkcs7DataObject) {
      throw new Error('PKCS#7 data object not found.');
    }

    try {
      const rawPayload = pkcs7DataObject.valueBlock.value[0].getValue();
      const payload = Buffer.from(rawPayload).toString();
      return JSON.parse(payload);
    } catch (error: any) {
      this.log.save('extract-json-from-der-error', { error: error.message, stack: error.stack }, 'error');
      throw new Error('Failed to extract JSON payload from PKCS#7 data object.');
    }
  }

  /**
   * Recursively find PKCS7 data object in asn1 sequence.
   * @private
   * @param {Sequence} sequence ASN1 sequence.
   * @returns {Sequence} PKCS7 data object.
   */
  findPKCS7DataObject(sequence: any): any {
    if (!sequence?.valueBlock?.value) {
      return null;
    }

    const subsequences = sequence.valueBlock.value.filter((v: any) => v instanceof Sequence);
    for (const element of subsequences) {
      const oid = element.valueBlock?.value[0]?.valueBlock?.toString();
      if (oid === '1.2.840.113549.1.7.1') {
        return element.valueBlock.value[1];
      }

      const result = this.findPKCS7DataObject(element);
      if (result) {
        return result;
      }
    }

    return null;
  }
}
