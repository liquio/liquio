import { StrategyOptions } from 'passport-oauth2';
import { Dialect } from 'sequelize';
import { z } from 'zod';

import { AuthProviderDisplay, IdApiConfig, LdapProviderConfig, OIDCProviderConfig } from './index';

const str = z.string().optional();
const bool = z.boolean().optional();
const strArr = z.array(z.string()).optional();
const isNumeric = (value: unknown): boolean =>
  typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
/** Number or numeric string (values coming from env variables are strings). */
const num = z.custom<number>(isNumeric, { message: 'Invalid input: expected number' }).optional();
const numRequired = z.custom<number>(isNumeric, { message: 'Invalid input: expected number' });

const displaySchema: z.ZodType<AuthProviderDisplay> = z.looseObject({ title: str, icon: str, description: str });

const ldapSchema: z.ZodType<LdapProviderConfig> = z.looseObject({
  isEnabled: bool,
  display: displaySchema.optional(),
  connection: z
    .looseObject({
      url: str,
      startTLS: bool,
      tlsOptions: z.looseObject({ ca: str, rejectUnauthorized: bool }).optional(),
      bindDN: str,
      bindPassword: str,
      timeout: num,
      connectTimeout: num,
    })
    .optional(),
  baseDN: str,
  userSearchBase: str,
  userFilter: str,
  idAttribute: str,
  nestedGroups: bool,
  attributes: z.record(z.string(), z.string()).optional(),
  linkByEmail: bool,
  accessGroups: strArr,
  sync: z.looseObject({ isEnabled: bool, intervalMinutes: num }).optional(),
});

const oidcProviderSchema: z.ZodType<OIDCProviderConfig> = z.looseObject({
  issuer: str,
  authorizationURL: str,
  tokenURL: str,
  userInfoURL: str,
  endSessionURL: str,
  clientID: str,
  clientSecret: str,
  callbackURL: str,
  scope: str,
  isEnabled: bool,
  mapping: z.record(z.string(), z.string()).optional(),
  userInfo: z.looseObject({ enabled: z.boolean() }).optional(),
  usePKCE: bool,
  display: displaySchema.optional(),
});

type OAuth2Config = NonNullable<IdApiConfig['auth_providers']['oauth2']>;

const scopes = z.enum(['user:read', 'user:write', 'user:admin', 'password:set', 'totp', 'login_history', 'login_history:all', 'login_history:pii']);

const isPlainHttp = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '' && /^http:\/\//i.test(value.trim());

/**
 * Builds the schema of the id-api config (the env section merged with `versions`).
 * It validates only: the merged object is returned unchanged by the loader.
 * @param env Runtime environment, internal transport rules apply in `production` and `prod`.
 */
export function buildIdApiConfigSchema(env: string): z.ZodType<IdApiConfig> {
  return z
    .looseObject({
      allowIdentificationTypes: strArr,
      allowEdrpou: strArr,
      allowRnokpp: strArr,
      cors: z.looseObject({ allowedOrigins: strArr, maxAge: num }).optional(),
      db: z.looseObject({
        host: z.string(),
        port: numRequired,
        database: z.string(),
        username: z.string(),
        password: z.string(),
        logging: bool,
        dialect: z.custom<Dialect>((v) => typeof v === 'string').optional(),
        ssl: bool,
        dialectOptions: z.any().optional(),
      }),
      host: str,
      port: num,
      modules: z.looseObject({ denyToUpdateUserName: bool, denyToUpdateUserValidParams: bool, setPhoneOnlyAsNotValid: bool }).optional(),
      notifyServer: z.looseObject({ host: str }).optional(),
      kindergartens: z.looseObject({ url: str, key: str }).optional(),
      session: z.looseObject({ secret_key: strArr }).optional(),
      domain: str,
      cookies: z
        .looseObject({
          secure: z.union([z.boolean(), z.literal('auto')]).optional(),
          sameSite: z.enum(['lax', 'strict', 'none']).optional(),
          profileHttpOnly: bool,
        })
        .optional(),
      trustProxy: z.union([z.number(), z.string(), z.array(z.string())]).optional(),
      legacyGetConfirmation: bool,
      notify: z.looseObject({ url: str, authorization: str }).optional(),
      internalTransport: z.looseObject({ ca: z.union([z.string(), z.array(z.string())]).optional(), allowPlainHttp: bool }).optional(),
      admin_config: z.looseObject({ api_url: str, login: str, password: str }).optional(),
      jwt: z.looseObject({ secret: str, expiresIn: z.any().optional() }).optional(),
      user_info: z.looseObject({ allowTwoFactorFields: bool }).optional(),
      basic_auth: z
        .looseObject({
          allowLegacySharedSecret: bool,
          clients: z
            .array(
              z.looseObject({
                name: z.string(),
                secret: str,
                secret_hash: str,
                scopes: z.array(scopes).optional(),
                maxLimit: num,
              }),
            )
            .optional(),
        })
        .optional(),
      roles: strArr,
      oauth: z
        .looseObject({
          accessTokenLifetimeInSeconds: num,
          refreshTokenLifetimeInSeconds: num,
          secret_key: strArr,
          enforceScopeConsent: bool,
          defaults: z
            .looseObject({
              client_id: str,
              client_secret: str,
              redirect_uri: strArr,
              state: str,
              scope_fields: strArr,
              need_scope_approve: bool,
              client_name: str,
              scope: strArr,
            })
            .optional(),
        })
        .optional(),
      mail: z.looseObject({ gateway: str, from: str }).optional(),
      auth_providers: z.looseObject({
        totp: z.looseObject({ requireUserToken: bool }).optional(),
        govid: z
          .looseObject({
            timeout: num,
            authorizationUrl: str,
            clientId: str,
            clientSecret: str,
            redirectUrl: str,
            useEncryption: bool,
            idCert: str,
            encryptionServiceUrl: str,
            encryptionServiceToken: str,
            namesNaList: strArr,
            authType: z.union([z.string(), z.array(z.string())]).optional(),
          })
          .optional(),
        bankid: z
          .looseObject({
            authorizationURL: str,
            tokenURL: str,
            customerURL: str,
            clientID: str,
            clientSecret: str,
            callbackURL: str,
            privateKey: str,
            passReqToCallback: str,
          })
          .optional(),
        local: z
          .looseObject({
            isEnabled: bool,
            isForgotPasswordEnabled: bool,
            resetPasswordUrl: str,
            resetPasswordSubject: str,
            resetPasswordBody: str,
            resetPasswordTokenExpiration: num,
            display: displaySchema.optional(),
          })
          .optional(),
        wso2: z.looseObject({ isEnabled: bool, display: displaySchema.optional() }).optional(),
        x509: z.looseObject({ isEnabled: bool, display: displaySchema.optional(), requireChallenge: bool }).optional(),
        ldap: ldapSchema.optional(),
        oauth2: z.custom<OAuth2Config & StrategyOptions>((v) => v === undefined || (typeof v === 'object' && v !== null)).optional(),
        oidc: z.record(z.string(), oidcProviderSchema).optional(),
      }),
      passwordManager: z
        .looseObject({
          minPasswordLength: num,
          maxAttempts: num,
          maxAttemptDelay: num,
          hashingSaltRounds: num,
          rememberLastPasswords: num,
          allowAdminSet: bool,
        })
        .optional(),
      pingRoutes: z.looseObject({ notify: str, eds: str }).optional(),
      users: z.looseObject({ maxLimit: num, maxBatch: num, fullReadClients: strArr }).optional(),
      redis: z.looseObject({ isEnabled: bool, host: str, port: num, defaultTtl: num, prefix: str }),
      confirmCodeLength: num,
      confirmCodeRetries: num,
      confirmCodeEmailTemplate: str,
      confirmCodeEmailHeader: str,
      accountExistsEmailHeader: str,
      accountExistsEmailText: str,
      confirmCodeEmailChangeHeader: str,
      swagger: bool,
      customer: str,
      environment: str,
      x509: z.looseObject({ isEnabled: bool, externalUrl: str, timeout: num }).optional(),
      enabledDeleteUser: bool,
      log: z.looseObject({ excludeParams: strArr, disableDefaultRedaction: bool }).optional(),
      signUp: z.looseObject({ isEnabled: bool }).optional(),
      gtm_key: str,
      separateLegalUsers: bool,
      eds: z
        .looseObject({
          onlyLegalEntityAllow: bool,
          sign_proxy_url: str,
          sign_proxy_allowed_paths: strArr,
          sign_proxy_allowed_methods: strArr,
          ics_proxy: z.looseObject({ enabled: bool, allowed_paths: strArr, timeout: num }).optional(),
          unavailableMessage: str,
          limit: num,
          timeout: num,
        })
        .optional(),
      encryption: z.looseObject({ enabled: bool, algorithm: str, securityKey: str, iv: str }).optional(),
      edsServer: z.looseObject({ host: str, acskListUrl: str, signVerifyUrl: str }).optional(),
      testConfirmations: z.looseObject({ codes: strArr }).optional(),
      versions: z.looseObject({ services: z.array(z.looseObject({ name: z.string(), minVersion: z.string() })) }).optional(),
      confirmCode: z
        .looseObject({
          ttlMinutes: num,
          sendLimit: z
            .looseObject({
              recipientMax: num,
              recipientWindowSeconds: num,
              sourceMax: num,
              sourceWindowSeconds: num,
              twoFactor: z.looseObject({ recipientMax: num, recipientWindowSeconds: num, sourceMax: num, sourceWindowSeconds: num }).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .superRefine((config, ctx) => {
      const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });

      for (const [providerId, provider] of Object.entries(config.auth_providers?.oidc ?? {})) {
        if (provider.isEnabled === false) {
          continue;
        }
        const base = ['auth_providers', 'oidc'];
        if (!providerId) {
          issue(base, 'providerId (key) is required');
        }
        for (const field of ['clientID', 'clientSecret', 'callbackURL'] as const) {
          if (!provider[field]) {
            issue([...base, providerId, field], 'is required');
          }
        }
        const hasIssuer = !!provider.issuer;
        const hasAllEndpoints = !!provider.authorizationURL && !!provider.tokenURL && !!provider.userInfoURL;
        if (!hasIssuer && !hasAllEndpoints) {
          issue([...base, providerId], 'must have either "issuer" or all of "authorizationURL", "tokenURL", "userInfoURL"');
        }
      }

      const ldap = config.auth_providers?.ldap;
      if (ldap?.isEnabled) {
        const base = ['auth_providers', 'ldap'];
        const url = ldap.connection?.url;
        if (!url) {
          issue([...base, 'connection', 'url'], 'is required');
        } else if (!/^ldaps?:\/\//i.test(url)) {
          issue([...base, 'connection', 'url'], 'must use the ldap:// or ldaps:// scheme');
        }
        // Without the service account the search would run as an anonymous bind.
        if (!ldap.connection?.bindDN) {
          issue([...base, 'connection', 'bindDN'], 'is required');
        }
        if (!ldap.connection?.bindPassword) {
          issue([...base, 'connection', 'bindPassword'], 'is required');
        }
        if (!ldap.baseDN) {
          issue([...base, 'baseDN'], 'is required');
        }
        if (!Array.isArray(ldap.accessGroups) || ldap.accessGroups.filter((group) => typeof group === 'string' && group.trim()).length === 0) {
          issue([...base, 'accessGroups'], 'must contain at least one group');
        }
        const intervalMinutes = ldap.sync?.intervalMinutes;
        if (intervalMinutes !== undefined && (typeof intervalMinutes !== 'number' || !Number.isFinite(intervalMinutes) || intervalMinutes <= 0)) {
          issue([...base, 'sync', 'intervalMinutes'], 'must be a number greater than 0');
        }
      }

      if ((env === 'production' || env === 'prod') && config.internalTransport?.allowPlainHttp !== true) {
        const urls: { path: string[]; url: unknown }[] = [
          { path: ['notify', 'url'], url: config.notify?.url },
          { path: ['pingRoutes', 'notify'], url: config.pingRoutes?.notify },
          { path: ['x509', 'externalUrl'], url: config.x509?.externalUrl },
        ];
        for (const { path, url } of urls) {
          if (isPlainHttp(url)) {
            issue(
              path,
              'uses plain http:// in production: use https:// (and internalTransport.ca for a private CA), or set internalTransport.allowPlainHttp to true when NetworkPolicies/service mesh protect the traffic',
            );
          }
        }
      }
    });
}
