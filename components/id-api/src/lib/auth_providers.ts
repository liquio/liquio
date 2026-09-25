import { AuthProviderDisplay, Config } from '../config';

export interface AuthProviderOption {
  type: 'local' | 'x509' | 'wso2' | 'oidc';
  id: string;
  url: string | null;
  title?: string;
  icon?: string;
  description?: string;
}

function toOption(type: AuthProviderOption['type'], id: string, url: string | null, display?: AuthProviderDisplay): AuthProviderOption {
  return {
    type,
    id,
    url,
    title: display?.title,
    icon: display?.icon,
    description: display?.description,
  };
}

/**
 * Enumerate currently enabled login options for the frontend, mirroring the
 * enable checks in middleware/authenticate.ts so this list never drifts from
 * which strategies are actually registered.
 */
export function getEnabledAuthProviders(config: Config): AuthProviderOption[] {
  const authProviders = config.auth_providers ?? {};
  const options: AuthProviderOption[] = [];

  if (authProviders.local?.isEnabled) {
    options.push(toOption('local', 'local', null, authProviders.local.display));
  }

  if (authProviders.x509?.isEnabled) {
    options.push(toOption('x509', 'x509', null, authProviders.x509.display));
  }

  if (authProviders.wso2?.isEnabled) {
    options.push(toOption('wso2', 'wso2', '/authorise/wso2', authProviders.wso2.display));
  }

  for (const [providerId, provider] of Object.entries(authProviders.oidc ?? {})) {
    if (provider.isEnabled === false) {
      continue;
    }
    options.push(toOption('oidc', providerId, `/authorise/oidc/${providerId}`, provider.display));
  }

  return options;
}
