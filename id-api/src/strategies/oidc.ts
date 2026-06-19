import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import crypto from 'crypto';

import { CallbackFn, Express } from '../types';
import { Log } from '../lib/log';
import { Models, UserAttributes } from '../models';
import { OIDCProviderConfig } from '../config';

interface OIDCMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
}

/**
 * Resolve OIDC endpoints from discovery or use provided overrides
 */
async function resolveOIDCEndpoints(provider: OIDCProviderConfig, log: Log): Promise<OIDCMetadata> {
  const log_tag = `oidc|${provider.name}|discovery`;

  // If all endpoints are provided, use them directly (overrides)
  if (provider.authorizationURL && provider.tokenURL && provider.userInfoURL) {
    log.save(log_tag, { status: 'using_overrides', provider: provider.name }, 'info');
    return {
      authorization_endpoint: provider.authorizationURL,
      token_endpoint: provider.tokenURL,
      userinfo_endpoint: provider.userInfoURL,
    };
  }

  // Otherwise, discover from issuer
  if (!provider.issuer) {
    throw new Error(`OIDC provider ${provider.name}: must have either issuer or all endpoint overrides`);
  }

  try {
    const { data } = await axios({
      method: 'GET',
      url: `${provider.issuer}/.well-known/openid-configuration`,
      timeout: 10000,
    });

    log.save(log_tag, {
      status: 'discovery_success',
      provider: provider.name,
      issuer: provider.issuer,
      authorization_endpoint: data.authorization_endpoint,
      token_endpoint: data.token_endpoint,
      userinfo_endpoint: data.userinfo_endpoint,
    }, 'info');

    return {
      authorization_endpoint: data.authorization_endpoint,
      token_endpoint: data.token_endpoint,
      userinfo_endpoint: data.userinfo_endpoint,
    };
  } catch (error: any) {
    const response = error.response?.data;
    log.save(log_tag, { status: 'discovery_error', provider: provider.name, error: error.message, response }, 'error');
    throw error;
  }
}

/**
 * Map provider claims to internal user fields using provider-specific mapping
 */
function mapProviderClaims(providerClaims: Record<string, any>, mapping: Record<string, string> | undefined): Record<string, any> {
  if (!mapping) {
    return providerClaims;
  }

  const mapped: Record<string, any> = {};
  for (const [internalField, providerField] of Object.entries(mapping)) {
    if (providerField in providerClaims) {
      mapped[internalField] = providerClaims[providerField];
    }
  }

  return mapped;
}

/**
 * Generate PKCE parameters
 */
function generatePKCEParameters(): { codeVerifier: string; codeChallenge: string } {
  // Generate a random code verifier (43-128 characters of unreserved characters)
  const codeVerifier = crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Create code challenge from verifier using S256 method
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge };
}

/**
 * Custom OAuth2Strategy that supports PKCE
 */
class PKCEOAuth2Strategy extends OAuth2Strategy {
  private pkceParams: { codeVerifier: string; codeChallenge: string } | null = null;

  constructor(options: any, verify: any) {
    super(options, verify);
    // Override getOAuthAccessToken to include code_verifier for PKCE
    const self = this;
    const oauth2 = this._oauth2 as any;
    const originalGetOAuthAccessToken = oauth2.getOAuthAccessToken.bind(oauth2);
    oauth2.getOAuthAccessToken = function (code: string, params: any, callback: any) {
      if (self.pkceParams) {
        params = { ...params, code_verifier: self.pkceParams.codeVerifier };
      }
      return originalGetOAuthAccessToken(code, params, callback);
    };
  }

  setPKCEParams(pkceParams: { codeVerifier: string; codeChallenge: string }) {
    this.pkceParams = pkceParams;
  }

  authorizationParams(options: any) {
    if (this.pkceParams) {
      return {
        ...options,
        code_challenge: this.pkceParams.codeChallenge,
        code_challenge_method: 'S256',
      };
    }
    return options;
  }
}

export async function oidc(app: Express) {
  const log = Log.get();

  const providers = app.config?.auth_providers?.oidc?.providers;

  if (!providers || providers.length === 0) {
    log.save('oidc|init', { status: 'no_providers_configured' }, 'info');
    return;
  }

  const enabledProviders = providers.filter((p: OIDCProviderConfig) => p.isEnabled !== false);
  const disabledProviders = providers.filter((p: OIDCProviderConfig) => p.isEnabled === false);

  if (enabledProviders.length === 0) {
    log.save('oidc|init', { status: 'no_enabled_providers' }, 'info');
    return;
  }

  log.save('oidc|init', { status: 'initializing', provider_count: enabledProviders.length }, 'info');

  // Log disabled providers
  for (const provider of disabledProviders) {
    log.save(`oidc|${provider.name}`, { status: 'disabled' }, 'info');
  }

  // Map to store strategy instances for later access
  const strategyInstances = new Map<string, PKCEOAuth2Strategy>();

  // Initialize each provider
  for (const provider of enabledProviders) {
    try {
      // Resolve OIDC endpoints
      const metadata = await resolveOIDCEndpoints(provider, log);

      // Register passport strategy with provider-specific name
      const strategyName = `oidc-${provider.name}`;

      // Use PKCEOAuth2Strategy if PKCE is enabled, otherwise use regular OAuth2Strategy
      const strategyClass = provider.usePKCE ? PKCEOAuth2Strategy : OAuth2Strategy;

      const strategyInstance = new (strategyClass as any)(
        {
          authorizationURL: metadata.authorization_endpoint,
          tokenURL: metadata.token_endpoint,
          clientID: provider.clientID,
          clientSecret: provider.clientSecret,
          callbackURL: provider.callbackURL,
          scope: provider.scope || 'openid profile email',
          passReqToCallback: true,
        },
          async (req: any, accessToken: string, refreshToken: string, profile: any, done: CallbackFn) => {
            const log_tag = `oidc|${provider.name}|verify`;

            try {
              // Fetch user info
              let userInfo: Record<string, any>;

              try {
                const { data } = await axios({
                  method: 'GET',
                  url: metadata.userinfo_endpoint,
                  headers: { Authorization: `Bearer ${accessToken}` },
                  timeout: 10000,
                });

                userInfo = data;
                log.save(`${log_tag}|userinfo-fetch`, { status: 'success' }, 'info');
              } catch (error: any) {
                log.save(`${log_tag}|userinfo-fetch-error`, { error: error.message }, 'error');
                return done(error);
              }

              // Map claims to internal fields
              const mapped = mapProviderClaims(userInfo, provider.mapping);

              // Extract required provider ID (typically 'sub' in OIDC)
              const providerId = userInfo.sub;
              if (!providerId) {
                log.save(`${log_tag}|validation-error`, { error: 'no_sub_claim' }, 'error');
                return done(new Error('OIDC provider did not return sub claim'));
              }

              // Prepare user data for database
              const userData: Partial<UserAttributes> = {
                email: mapped.email || userInfo.email,
                phone: mapped.phone || userInfo.phone_number,
                first_name: mapped.first_name || userInfo.given_name,
                last_name: mapped.last_name || userInfo.family_name,
                middle_name: mapped.middle_name || userInfo.middle_name,
              };

              // Add custom mapped fields
              for (const [key, value] of Object.entries(mapped)) {
                if (!['email', 'phone', 'first_name', 'last_name', 'middle_name'].includes(key)) {
                  (userData as Record<string, any>)[key] = value;
                }
              }

              // Find existing user by email or provider ID
              let existingUser: UserAttributes | null = null;

              if (userData.email) {
                existingUser = await Models.model('user')
                  .findOne({
                    where: { email: userData.email },
                  })
                  .then((row) => row?.dataValues as UserAttributes);
              }

              // Upsert user
              let user: UserAttributes;
              if (existingUser) {
                // Update existing user
                await Models.model('user').update(userData, {
                  where: { userId: existingUser.userId },
                });

                user = { ...existingUser, ...userData };
              } else {
                // Create new user
                user = await Models.model('user')
                  .create(userData, { returning: true })
                  .then((row) => row.dataValues);
              }

              log.save(`${log_tag}|user-upsert`, { userId: user.userId, is_new: !existingUser }, 'info');

              // Upsert user service record
              const userService = await Models.model('userServices').upsert({
                userId: user.userId,
                provider: `oidc-${provider.name}`,
                provider_id: providerId,
                data: userInfo,
              });

              // Build session object
              const session = {
                ...user,
                provider: `oidc-${provider.name}`,
                services: { [`oidc-${provider.name}`]: userService },
              };

              log.save(`${log_tag}|authorize-success`, { userId: user.userId }, 'info');

              done(null, session);
            } catch (error: any) {
              log.save(`${log_tag}|error`, { error: error.message || `${error}` }, 'error');
              done(error);
            }
          },
      );

      // Register the strategy with passport
      app.passport.use(strategyName, strategyInstance);

      // Store strategy instance if it's PKCE-enabled
      if (provider.usePKCE && strategyInstance instanceof PKCEOAuth2Strategy) {
        strategyInstances.set(strategyName, strategyInstance);
      }

      log.save(`oidc|${provider.name}|strategy-registered`, { status: 'success', strategy_name: strategyName }, 'info');
    } catch (error: any) {
      log.save(`oidc|${provider.name}|registration-error`, { error: error.message }, 'error');
      // Continue with next provider instead of throwing
      continue;
    }
  }

  // Register dynamic routes
  app.get('/authorise/oidc/:provider', (req, res, next) => {
    const providerName = req.params.provider;
    const strategyName = `oidc-${providerName}`;

    const provider = enabledProviders.find((p: OIDCProviderConfig) => p.name === providerName);
    if (!provider) {
      log.save('oidc|route-auth|unknown-provider', { provider: providerName }, 'warn');
      return res.status(404).send({ error: 'Provider not found' });
    }

    log.save(`oidc|${providerName}|route-auth`, { status: 'initiated' }, 'info');

    // Handle PKCE if enabled
    if (provider.usePKCE) {
      const { codeVerifier, codeChallenge } = generatePKCEParameters();
      // Store verifier in session for callback
      const sessionData = req.session as any;
      sessionData.oidcPKCE = sessionData.oidcPKCE || {};
      sessionData.oidcPKCE[providerName] = { codeVerifier, codeChallenge };

      // Set PKCE params on the strategy
      const strategy = strategyInstances.get(strategyName);
      if (strategy) {
        strategy.setPKCEParams({ codeVerifier, codeChallenge });
      }
    }

    app.passport.authenticate(strategyName)(req, res, next);
  });

  app.get('/authorise/oidc/:provider/callback', (req, res, next) => {
    const providerName = req.params.provider;
    const strategyName = `oidc-${providerName}`;

    const provider = enabledProviders.find((p: OIDCProviderConfig) => p.name === providerName);
    if (!provider) {
      log.save('oidc|route-callback|unknown-provider', { provider: providerName }, 'warn');
      return res.status(404).send({ error: 'Provider not found' });
    }

    // Retrieve PKCE code_verifier if it was used
    const sessionData = req.session as any;
    const pkceParams = sessionData?.oidcPKCE?.[providerName];
    
    // For PKCE, we need to pass code_verifier in the token request
    // This is handled by OAuth2 module, but we store it for reference
    if (pkceParams && provider.usePKCE) {
      const strategy = strategyInstances.get(strategyName);
      if (strategy) {
        strategy.setPKCEParams(pkceParams);
      }
    }

    app.passport.authenticate(strategyName, { failureRedirect: '/login', keepSessionInfo: true }, async (err: any, user: any) => {
      if (err) {
        log.save(`oidc|${providerName}|route-callback|error`, { error: err.message }, 'error');
        return next(err);
      }

      if (!user) {
        log.save(`oidc|${providerName}|route-callback|no-user`, { status: 'failed' }, 'warn');
        return res.redirect('/login?error=authentication_failed');
      }

      req.logIn(user, async (err) => {
        if (err) {
          log.save(`oidc|${providerName}|route-callback|login-error`, { error: err.message }, 'error');
          return next(err);
        }

        req.session.save();
        await new Promise((resolve) => setTimeout(resolve, 250));

        log.save(`oidc|${providerName}|callback`, { status: 'success', userId: user.userId, isAuthenticated: req.isAuthenticated() }, 'info');

        res.redirect('/authorise/continue');
      });
    })(req, res, next);
  });

  log.save('oidc', { status: 'initialized', providers: providers.length }, 'info');
}
