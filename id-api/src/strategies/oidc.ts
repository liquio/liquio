import { Strategy } from 'passport-oauth2';
import axios from 'axios';

import { CallbackFn, Express } from '../types';
import { Log } from '../lib/log';
import { Models, UserAttributes } from '../models';
import { OIDCProviderConfig } from '../config';

/**
 * Generic OIDC Strategy Module
 *
 * Supports multiple OIDC providers with:
 * - Dynamic endpoint discovery via well-known configuration
 * - Provider-specific claim mapping
 * - Per-provider passport strategies and routes
 *
 * See: https://openid.net/specs/openid-connect-core-1_0.html
 */
export async function oidc(app: Express) {
  const log = Log.get();
  const passport = app.passport;

  const oidcConfig = app.config?.auth_providers?.oidc;

  if (!oidcConfig) {
    return;
  }

  if (!oidcConfig?.providers || oidcConfig.providers.length === 0) {
    log.save('oidc', { status: 'no_providers' }, 'info');
    return;
  }

  // Register a strategy for each enabled provider
  for (const provider of oidcConfig.providers) {
    if (provider.isEnabled === false) {
      log.save(`oidc|${provider.name}`, { status: 'disabled' }, 'info');
      continue;
    }

    try {
      await initializeProvider(app, provider, log, passport);
    } catch (error: any) {
      log.save(`oidc|${provider.name}|init`, { status: 'error', error: error.message }, 'error');
    }
  }

  log.save('oidc', { status: 'initialized', providers: oidcConfig.providers.length }, 'info');
}

/**
 * Initialize a single OIDC provider
 */
async function initializeProvider(app: Express, provider: OIDCProviderConfig, log: InstanceType<typeof Log>, passport: any) {
  const {
    name,
    issuer,
    clientID,
    clientSecret,
    callbackURL,
    scope = 'openid profile email',
    userInfo = { enabled: true },
    mapping = {},
    usePKCE,
  } = provider;

  // Resolve endpoints from discovery or explicit config
  let authorizationURL = provider.authorizationURL;
  let tokenURL = provider.tokenURL;
  let userInfoURL = provider.userInfoURL;

  if (!authorizationURL || !tokenURL || !userInfoURL) {
    if (!issuer) {
      throw new Error(`Provider ${name}: missing issuer or explicit endpoints`);
    }

    // Fetch discovery metadata
    const { data: discoveryData } = await axios({
      method: 'GET',
      url: `${issuer}/.well-known/openid-configuration`,
    });

    // Normalize endpoints to use the actual issuer URL (in case discovery returns different URL due to port mapping)
    const baseURL = issuer.replace(/\/$/, '');
    authorizationURL =
      authorizationURL || discoveryData.authorization_endpoint?.replace(/https?:\/\/[^\/]+/, baseURL) || discoveryData.authorization_endpoint;
    tokenURL = tokenURL || discoveryData.token_endpoint?.replace(/https?:\/\/[^\/]+/, baseURL) || discoveryData.token_endpoint;
    userInfoURL = userInfoURL || discoveryData.userinfo_endpoint?.replace(/https?:\/\/[^\/]+/, baseURL) || discoveryData.userinfo_endpoint;

    // Log with normalized issuer for consistency
    const normalizedDiscovery = {
      ...discoveryData,
      issuer: baseURL,
      authorization_endpoint: authorizationURL,
      token_endpoint: tokenURL,
      userinfo_endpoint: userInfoURL,
    };
    log.save(`oidc|${name}|discovery`, normalizedDiscovery, 'info');
  }

  if (!authorizationURL || !tokenURL) {
    throw new Error(`Provider ${name}: unable to resolve authorization_endpoint or token_endpoint`);
  }

  // Define passport strategy with provider-specific name
  passport.use(
    name,
    new Strategy(
      {
        authorizationURL,
        tokenURL,
        clientID,
        clientSecret,
        callbackURL,
        scope: Array.isArray(scope) ? scope.join(' ') : scope,
        passReqToCallback: true,
        state: !!usePKCE,
        ...(usePKCE && { pkce: true }),
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: CallbackFn) => {
        try {
          let claims: Record<string, any> = {};

          // Fetch userinfo if enabled
          if (userInfo?.enabled && userInfoURL) {
            try {
              const { data: userInfoData } = await axios({
                method: 'GET',
                url: userInfoURL,
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              claims = userInfoData;
              log.save(`oidc|${name}|userinfo`, { status: 'success' }, 'info');
            } catch (error: any) {
              log.save(`oidc|${name}|userinfo-error`, { error: error.message }, 'error');
              // Fall through - may still have id_token claims
            }
          }

          // Map claims using provider configuration
          const mappedUser = mapClaims(claims, mapping);

          // Find or create user
          const existingUser = await findOrCreateUser(mappedUser);

          // Upsert user services record
          const providerId = claims[mapping.providerId || 'sub'] || claims.sub || profile.id;
          const userService = await Models.model('userServices').upsert({
            userId: existingUser.userId,
            provider: name,
            provider_id: String(providerId),
            data: claims,
          });

          // Build session
          const session = {
            ...existingUser,
            provider: name,
            services: { [name]: userService },
          };

          log.save(`oidc|${name}|callback`, { userId: existingUser.userId, status: 'success' }, 'info');

          done(null, session);
        } catch (error: any) {
          log.save(`oidc|${name}|callback-error`, { error: error.message }, 'error');
          done(error);
        }
      },
    ),
  );

  // Route for frontend to redirect to provider
  app.get(`/authorise/oidc/${name}`, passport.authenticate(name));

  // Route to handle callback from provider
  app.get(`/authorise/oidc/${name}/callback`, passport.authenticate(name, { failureRedirect: '/login', keepSessionInfo: true }), async (req, res) => {
    req.session.save();
    await new Promise((resolve) => setTimeout(resolve, 250));
    log.save(`oidc|${name}|callback-redirect`, { userId: req.user?.userId }, 'info');
    res.redirect('/authorise/continue');
  });

  log.save(`oidc|${name}|init`, { status: 'initialized' }, 'info');
}

/**
 * Map OAuth2 claims to internal user fields using provider mapping
 */
function mapClaims(claims: Record<string, any>, mapping: Record<string, string>): Partial<UserAttributes> {
  const mapped: Partial<UserAttributes> = {};

  const fieldMap: Record<string, string> = {
    email: mapping.email || 'email',
    ipn: mapping.ipn || 'itin',
    edrpou: mapping.edrpou || 'organization_edrpou',
    phone: mapping.phone || 'phone_number',
    companyName: mapping.companyName || 'organization_name',
    first_name: mapping.first_name || 'given_name',
    last_name: mapping.last_name || 'family_name',
    middle_name: mapping.middle_name || 'middle_name',
  };

  for (const [userField, claimField] of Object.entries(fieldMap)) {
    if (claims[claimField]) {
      (mapped as any)[userField] = claims[claimField];
    }
  }

  return mapped;
}

/**
 * Find existing user by ipn, or create a new one
 */
async function findOrCreateUser(userData: Partial<UserAttributes>): Promise<UserAttributes> {
  // Try to find by ipn first (preferred identifier)
  if (userData.ipn) {
    const existingUser = await Models.model('user')
      .findOne({ where: { ipn: userData.ipn } })
      .then((row) => row?.dataValues);

    if (existingUser) {
      return existingUser;
    }
  }

  // Try to find by email if present
  if (userData.email) {
    const existingUser = await Models.model('user')
      .findOne({ where: { email: userData.email } })
      .then((row) => row?.dataValues);

    if (existingUser) {
      return existingUser;
    }
  }

  // Create new user
  const newUser = await Models.model('user')
    .create(userData, { returning: true })
    .then((row) => row.dataValues);

  return newUser;
}
