import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';

import { CallbackFn, Express } from '../types';
import { Log } from '../lib/log';
import { Models, UserAttributes } from '../models';
import { OIDCProviderConfig } from '../config';
import { PKCEOAuth2Strategy, generatePKCEParameters } from './passport_libs/passport-oidc/strategy';

interface OIDCMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
}

interface OIDCProviderRuntimeState {
  status: 'initialized' | 'registration_failed' | 'disabled';
  error?: string;
}

/**
 * OIDC Provider with runtime state tracking and provider-specific error handling
 */
class OidcProvider {
  private log: Log;
  private app: Express;
  private providersMap?: Record<string, OIDCProviderConfig>;
  private providersById: Map<string, OIDCProviderConfig>;
  private providerStates: Map<string, OIDCProviderRuntimeState>;
  private strategyInstances: Map<string, PKCEOAuth2Strategy>;

  constructor(app: Express) {
    this.app = app;
    this.log = Log.get();
    this.providersById = new Map();
    this.providerStates = new Map();
    this.strategyInstances = new Map();
  }

  /**
   * Initialize OIDC provider(s) asynchronously
   */
  async init(): Promise<void> {
    this.providersMap = this.app.config?.auth_providers?.oidc;

    if (!this.providersMap || Object.keys(this.providersMap).length === 0) {
      this.log.save('oidc|init', { status: 'no_providers_configured' }, 'info');
      return;
    }

    const providerEntries = Object.entries(this.providersMap);
    const enabledProviderCount = providerEntries.reduce((count, [, provider]) => (provider.isEnabled === false ? count : count + 1), 0);

    if (enabledProviderCount === 0) {
      this.log.save('oidc|init', { status: 'no_enabled_providers' }, 'info');
      return;
    }

    this.log.save('oidc|init', { status: 'initializing', provider_count: enabledProviderCount }, 'info');

    this.providersById = new Map(providerEntries);

    // Initialize runtime state for all providers
    for (const [providerId, provider] of providerEntries) {
      if (provider.isEnabled === false) {
        this.log.save(`oidc|${providerId}`, { status: 'disabled' }, 'info');
        this.providerStates.set(providerId, { status: 'disabled' });
        continue;
      }

      this.providerStates.set(providerId, { status: 'registration_failed', error: 'provider_not_initialized' });
    }

    // Register OIDC strategies
    for (const [providerId, provider] of providerEntries) {
      if (provider.isEnabled === false) {
        continue;
      }

      await this.registerProvider(providerId, provider);
    }

    // Register dynamic routes
    this.registerRoutes();

    this.log.save('oidc', { status: 'initialized', providers: enabledProviderCount }, 'info');
  }

  /**
   * Register a single OIDC provider strategy
   */
  private async registerProvider(providerId: string, provider: OIDCProviderConfig): Promise<void> {
    try {
      const metadata = await this.resolveOIDCEndpoints(providerId, provider);
      const strategyName = `oidc-${providerId}`;
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
        (req: any, accessToken: string, refreshToken: string, profile: any, done: CallbackFn) =>
          this.verifyOIDCUser(providerId, provider, metadata, accessToken, done),
      );

      this.app.passport.use(strategyName, strategyInstance);

      if (provider.usePKCE && strategyInstance instanceof PKCEOAuth2Strategy) {
        this.strategyInstances.set(strategyName, strategyInstance);
      }

      this.providerStates.set(providerId, { status: 'initialized' });
      this.log.save(`oidc|${providerId}|strategy-registered`, { status: 'success', strategy_name: strategyName }, 'info');
    } catch (error: any) {
      this.providerStates.set(providerId, {
        status: 'registration_failed',
        error: error.message || `${error}`,
      });

      this.log.save(`oidc|${providerId}|registration-error`, { error: error.message }, 'error');
    }
  }

  /**
   * Register dynamic routes for auth and callback
   */
  private registerRoutes(): void {
    this.app.get('/authorise/oidc/:provider', (req, res, next) => {
      const providerId = req.params.provider;
      const strategyName = `oidc-${providerId}`;

      const readiness = this.ensureProviderReady(providerId, 'route-auth');
      if (!readiness.ok) {
        return res.status(readiness.statusCode).send(readiness.body);
      }
      const activeProvider = readiness.provider;

      this.log.save(`oidc|${providerId}|route-auth`, { status: 'initiated' }, 'info');

      if (activeProvider.usePKCE) {
        const { codeVerifier, codeChallenge } = generatePKCEParameters();
        const sessionData = req.session as any;
        sessionData.oidcPKCE = sessionData.oidcPKCE || {};
        sessionData.oidcPKCE[providerId] = { codeVerifier, codeChallenge };

        const strategy = this.strategyInstances.get(strategyName);
        if (strategy) {
          strategy.setPKCEParams({ codeVerifier, codeChallenge });
        }
      }

      this.app.passport.authenticate(strategyName)(req, res, next);
    });

    this.app.get('/authorise/oidc/:provider/callback', (req, res, next) => {
      const providerId = req.params.provider;
      const strategyName = `oidc-${providerId}`;

      const readiness = this.ensureProviderReady(providerId, 'route-callback');
      if (!readiness.ok) {
        return res.status(readiness.statusCode).send(readiness.body);
      }
      const activeProvider = readiness.provider;

      const sessionData = req.session as any;
      const pkceParams = sessionData?.oidcPKCE?.[providerId];

      if (pkceParams && activeProvider.usePKCE) {
        const strategy = this.strategyInstances.get(strategyName);
        if (strategy) {
          strategy.setPKCEParams(pkceParams);
        }
      }

      this.app.passport.authenticate(strategyName, { failureRedirect: '/login', keepSessionInfo: true }, async (err: any, user: any) => {
        if (err) {
          this.log.save(`oidc|${providerId}|route-callback|error`, { error: err.message }, 'error');
          return next(err);
        }

        if (!user) {
          this.log.save(`oidc|${providerId}|route-callback|no-user`, { status: 'failed' }, 'warn');
          return res.redirect('/login?error=authentication_failed');
        }

        req.logIn(user, async (err) => {
          if (err) {
            this.log.save(`oidc|${providerId}|route-callback|login-error`, { error: err.message }, 'error');
            return next(err);
          }

          req.session.save();
          await new Promise((resolve) => setTimeout(resolve, 250));

          this.log.save(`oidc|${providerId}|callback`, { status: 'success', userId: user.userId, isAuthenticated: req.isAuthenticated() }, 'info');

          res.redirect('/authorise/continue');
        });
      })(req, res, next);
    });
  }

  /**
   * Check provider readiness and return appropriate response
   */
  private ensureProviderReady(
    providerId: string,
    routeTag: 'route-auth' | 'route-callback',
  ): { ok: true; provider: OIDCProviderConfig } | { ok: false; statusCode: number; body: Record<string, any> } {
    const provider = this.providersById.get(providerId);
    if (!provider) {
      this.log.save(`oidc|${routeTag}|unknown-provider`, { providerId }, 'warn');
      return { ok: false, statusCode: 404, body: { error: 'Provider not found' } };
    }

    const providerState = this.providerStates.get(providerId);
    if (providerState?.status === 'disabled') {
      this.log.save(`oidc|${providerId}|${routeTag}|provider-disabled`, { status: 'disabled' }, 'warn');
      return {
        ok: false,
        statusCode: 503,
        body: {
          error: 'OIDC provider is disabled',
          providerId,
        },
      };
    }

    if (!providerState || providerState.status !== 'initialized') {
      const initError = providerState?.error || 'provider_not_initialized';
      this.log.save(`oidc|${providerId}|${routeTag}|provider-unavailable`, { status: 'unavailable', error: initError }, 'warn');
      return {
        ok: false,
        statusCode: 503,
        body: {
          error: 'OIDC provider temporarily unavailable',
          providerId,
          details: initError,
        },
      };
    }

    return { ok: true, provider };
  }

  /**
   * Resolve OIDC endpoints from discovery or use provided overrides
   */
  private async resolveOIDCEndpoints(providerId: string, provider: OIDCProviderConfig): Promise<OIDCMetadata> {
    const log_tag = `oidc|${providerId}|discovery`;

    if (provider.authorizationURL && provider.tokenURL && provider.userInfoURL) {
      this.log.save(log_tag, { status: 'using_overrides', providerId }, 'info');
      return {
        authorization_endpoint: provider.authorizationURL,
        token_endpoint: provider.tokenURL,
        userinfo_endpoint: provider.userInfoURL,
      };
    }

    if (!provider.issuer) {
      throw new Error(`OIDC provider ${providerId}: must have either issuer or all endpoint overrides`);
    }

    try {
      const { data } = await axios({
        method: 'GET',
        url: `${provider.issuer}/.well-known/openid-configuration`,
        timeout: 10000,
      });

      this.log.save(
        log_tag,
        {
          status: 'discovery_success',
          providerId,
          issuer: provider.issuer,
          authorization_endpoint: data.authorization_endpoint,
          token_endpoint: data.token_endpoint,
          userinfo_endpoint: data.userinfo_endpoint,
        },
        'info',
      );

      return {
        authorization_endpoint: data.authorization_endpoint,
        token_endpoint: data.token_endpoint,
        userinfo_endpoint: data.userinfo_endpoint,
      };
    } catch (error: any) {
      const response = error.response?.data;
      this.log.save(log_tag, { status: 'discovery_error', providerId, error: error.message, response }, 'error');
      throw error;
    }
  }

  /**
   * Verify OIDC user info and upsert into database
   */
  private async verifyOIDCUser(
    providerId: string,
    provider: OIDCProviderConfig,
    metadata: OIDCMetadata,
    accessToken: string,
    done: CallbackFn,
  ): Promise<void> {
    const log_tag = `oidc|${providerId}|verify`;

    try {
      let userInfo: Record<string, any>;

      try {
        const { data } = await axios({
          method: 'GET',
          url: metadata.userinfo_endpoint,
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000,
        });

        userInfo = data;
        this.log.save(`${log_tag}|userinfo-fetch`, { status: 'success' }, 'info');
      } catch (error: any) {
        this.log.save(`${log_tag}|userinfo-fetch-error`, { error: error.message }, 'error');
        return done(error);
      }

      const mapped = this.mapProviderClaims(userInfo, provider.mapping);

      const userProviderId = userInfo.sub;
      if (!userProviderId) {
        this.log.save(`${log_tag}|validation-error`, { error: 'no_sub_claim' }, 'error');
        return done(new Error('OIDC provider did not return sub claim'));
      }

      const userData: Partial<UserAttributes> = {
        email: mapped.email || userInfo.email,
        phone: mapped.phone || userInfo.phone_number,
        first_name: mapped.first_name || userInfo.given_name,
        last_name: mapped.last_name || userInfo.family_name,
        middle_name: mapped.middle_name || userInfo.middle_name,
      };

      for (const [key, value] of Object.entries(mapped)) {
        if (!['email', 'phone', 'first_name', 'last_name', 'middle_name'].includes(key)) {
          (userData as Record<string, any>)[key] = value;
        }
      }

      let existingUser: UserAttributes | null = null;

      if (userData.email) {
        existingUser = await Models.model('user')
          .findOne({
            where: { email: userData.email },
          })
          .then((row) => row?.dataValues as UserAttributes);
      }

      let user: UserAttributes;
      if (existingUser) {
        await Models.model('user').update(userData, {
          where: { userId: existingUser.userId },
        });

        user = { ...existingUser, ...userData };
      } else {
        user = await Models.model('user')
          .create(userData, { returning: true })
          .then((row) => row.dataValues);
      }

      this.log.save(`${log_tag}|user-upsert`, { userId: user.userId, is_new: !existingUser }, 'info');

      const userService = await Models.model('userServices').upsert({
        userId: user.userId,
        provider: `oidc-${providerId}`,
        provider_id: userProviderId,
        data: userInfo,
      });

      const session = {
        ...user,
        provider: `oidc-${providerId}`,
        services: { [`oidc-${providerId}`]: userService },
      };

      this.log.save(`${log_tag}|authorize-success`, { userId: user.userId }, 'info');

      done(null, session);
    } catch (error: any) {
      this.log.save(`${log_tag}|error`, { error: error.message || `${error}` }, 'error');
      done(error);
    }
  }

  /**
   * Map provider claims to internal user fields using provider-specific mapping
   */
  private mapProviderClaims(providerClaims: Record<string, any>, mapping: Record<string, string> | undefined): Record<string, any> {
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
}

export async function oidc(app: Express): Promise<void> {
  const provider = new OidcProvider(app);
  await provider.init();
}
