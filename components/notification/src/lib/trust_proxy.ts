/**
 * Express `trust proxy` setting: hop count, or IP/CIDR/preset list of known ingress proxies.
 * Unset (or 0/false) trusts nothing, so `req.ip` is the direct peer and `X-Forwarded-*` is ignored.
 */
export type TrustProxyConfig = number | string | string[];

/**
 * Resolve the `trustProxy` config value to an Express `trust proxy` setting.
 * Returns undefined (trust nothing) for unset, 0, false, empty and invalid values.
 * `true` is rejected on purpose: it trusts every hop, so any client could spoof `X-Forwarded-For`
 * and dodge the per-IP login rate limit.
 * @param {unknown} value Configured value.
 * @returns {TrustProxyConfig|undefined}
 */
export function resolveTrustProxy(value: unknown): TrustProxyConfig | undefined {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed) > 0 ? Number(trimmed) : undefined;
    return trimmed && !['true', 'false'].includes(trimmed.toLowerCase()) ? trimmed : undefined;
  }
  if (Array.isArray(value) && value.length && value.every((item) => typeof item === 'string' && item.trim())) {
    return value as string[];
  }
  return undefined;
}

/**
 * Apply the configured `trust proxy` setting to the Express app, if any.
 * @param {{ set: Function }} app Express app.
 * @param {unknown} value Configured `trustProxy` value.
 */
export function applyTrustProxy(app: { set: (name: string, value: unknown) => unknown }, value: unknown): void {
  const resolved = resolveTrustProxy(value);
  if (resolved !== undefined) app.set('trust proxy', resolved);
}
