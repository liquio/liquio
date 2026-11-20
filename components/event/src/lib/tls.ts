import https from 'node:https';

import axios, { AxiosInstance } from 'axios';

export interface TlsOptions {
  allowInsecureTls?: boolean;
  ca?: string | string[];
}

export interface TlsEndpointOptions extends TlsOptions {
  url: string;
}

/**
 * Build HTTPS agent for a single connection.
 * Returns undefined when default TLS verification should be used.
 * @param {TlsOptions} [options] TLS options.
 * @returns {https.Agent | undefined}
 */
export function buildHttpsAgent(options?: TlsOptions): https.Agent | undefined {
  const { allowInsecureTls, ca } = options || {};
  const hasCa = Array.isArray(ca) ? ca.length > 0 : !!ca;
  if (!allowInsecureTls && !hasCa) {
    return undefined;
  }
  return new https.Agent({
    ...(hasCa ? { ca } : {}),
    // A custom CA is the preferred way. Verification is disabled only on explicit opt-in.
    ...(allowInsecureTls ? { rejectUnauthorized: false } : {}),
  });
}

/**
 * Install axios interceptor which applies per-endpoint TLS options by URL origin.
 * Requests to any other origin keep default TLS verification.
 * @param {TlsEndpointOptions[]} endpoints Endpoints with TLS options.
 * @param {(...args: any[]) => any} [warn] Warning logger.
 * @param {AxiosInstance} [instance] Axios instance.
 */
export function installTlsOverrides(endpoints: TlsEndpointOptions[], warn?: (...args: any[]) => any, instance: AxiosInstance = axios): void {
  const byOrigin = new Map<string, https.Agent>();
  for (const endpoint of endpoints || []) {
    const agent = buildHttpsAgent(endpoint);
    if (!agent || !endpoint.url) continue;
    let origin: string;
    try {
      origin = new URL(endpoint.url).origin;
    } catch {
      continue;
    }
    byOrigin.set(origin, agent);
    if (endpoint.allowInsecureTls) {
      warn?.(`TLS certificate verification is DISABLED for ${origin} (allowInsecureTls). Prefer configuring "ca".`);
    }
  }

  if (!byOrigin.size) return;

  instance.interceptors.request.use((requestConfig) => {
    if (requestConfig.httpsAgent || !requestConfig.url) return requestConfig;
    try {
      const agent = byOrigin.get(new URL(requestConfig.url, requestConfig.baseURL).origin);
      if (agent) requestConfig.httpsAgent = agent;
    } catch {
      // Ignore invalid URL, axios will report it.
    }
    return requestConfig;
  });
}
