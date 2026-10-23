import dns from 'dns';
import net from 'net';

// Schemes that never leave the browser process.
const LOCAL_SCHEMES = ['data:', 'blob:', 'about:'];
const REMOTE_SCHEMES = ['http:', 'https:'];

export type ResolvedAddress = { address: string; family: number };
export type HostLookup = (hostname: string) => Promise<ResolvedAddress[]>;

export type UrlCheckResult = {
  allowed: boolean;
  reason?: string;
  url?: URL;
  // Addresses the host resolved to (remote URLs only). All of them are public.
  addresses?: ResolvedAddress[];
};

export type UrlCheckOptions = {
  // Hostnames http(s) resources may be loaded from. Empty list blocks all remote resources.
  allowedHosts?: string[];
  lookup?: HostLookup;
  // Only allow http(s) URLs (used for server-side downloads).
  remoteOnly?: boolean;
};

export const defaultLookup: HostLookup = (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true });

/**
 * Checks if an IP address literal is loopback, private, link-local, metadata, CGNAT, multicast or unspecified.
 * @param {string} ip - IPv4 or IPv6 address.
 * @returns {boolean} True when the address must not be reached.
 */
export function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateIpv4(ip.split('.').map(Number));
  }

  if (version === 6) {
    return isPrivateIpv6(ip.toLowerCase());
  }

  // Not an IP: treat as unsafe.
  return true;
}

function isPrivateIpv4([a, b, c]: number[]): boolean {
  return (
    a === 0 || // "this" network, unspecified
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) || // IETF protocol assignments
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast, reserved, broadcast
  );
}

function isPrivateIpv6(ip: string): boolean {
  // Expand to 8 groups so that prefixes can be checked reliably.
  const groups = expandIpv6(ip);
  if (!groups) {
    return true;
  }

  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;

  // :: and ::1
  if (groups.slice(0, 7).every((g) => g === 0) && (g7 === 0 || g7 === 1)) {
    return true;
  }

  // IPv4-mapped (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d) and NAT64 (64:ff9b::/96).
  const isMapped = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && (g5 === 0xffff || g5 === 0);
  const isNat64 = g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0;
  if (isMapped || isNat64) {
    return isPrivateIpv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]);
  }

  return (
    (g0 & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (g0 & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (g0 & 0xffc0) === 0xfec0 || // fec0::/10 site-local
    (g0 & 0xff00) === 0xff00 // multicast
  );
}

function expandIpv6(ip: string): number[] | null {
  let address = ip.split('%')[0];

  // Convert an embedded IPv4 tail into two groups.
  const lastColon = address.lastIndexOf(':');
  const tail = address.slice(lastColon + 1);
  if (tail.includes('.')) {
    if (net.isIPv4(tail) === false) {
      return null;
    }

    const [a, b, c, d] = tail.split('.').map(Number);
    address = `${address.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const [head, rest, extra] = address.split('::');
  if (extra !== undefined) {
    return null;
  }

  const headGroups = head ? head.split(':') : [];
  const restGroups = rest ? rest.split(':') : [];
  const missing = 8 - headGroups.length - restGroups.length;
  if ((rest === undefined && missing !== 0) || missing < 0) {
    return null;
  }

  const groups = [...headGroups, ...(rest === undefined ? [] : new Array(missing).fill('0')), ...restGroups].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => !Number.isNaN(g)) ? groups : null;
}

/**
 * Decides whether the browser (or this process) may request the URL.
 * Remote hosts must be allowlisted and resolve only to public addresses.
 * @param {string} rawUrl - URL to check.
 * @param {UrlCheckOptions} options - Guard options.
 * @returns {Promise<UrlCheckResult>} Check result.
 */
export async function checkUrl(rawUrl: string, options: UrlCheckOptions = {}): Promise<UrlCheckResult> {
  const { allowedHosts = [], lookup = defaultLookup, remoteOnly = false } = options;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'invalid-url' };
  }

  if (!remoteOnly && LOCAL_SCHEMES.includes(url.protocol)) {
    return { allowed: true, url };
  }

  if (!REMOTE_SCHEMES.includes(url.protocol)) {
    return { allowed: false, reason: 'scheme-not-allowed', url };
  }

  // URL normalizes decimal/hex/octal IPv4 forms; IPv6 literals come in brackets.
  const hostname = url.hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
  if (!hostname) {
    return { allowed: false, reason: 'invalid-url', url };
  }

  const isListed = allowedHosts.some((host) => host.trim().toLowerCase() === hostname);
  if (!isListed) {
    return { allowed: false, reason: 'host-not-allowed', url };
  }

  if (net.isIP(hostname)) {
    return isPrivateAddress(hostname)
      ? { allowed: false, reason: 'private-address', url }
      : { allowed: true, url, addresses: [{ address: hostname, family: net.isIP(hostname) }] };
  }

  let addresses: ResolvedAddress[];
  try {
    addresses = await lookup(hostname);
  } catch {
    return { allowed: false, reason: 'dns-failure', url };
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    return { allowed: false, reason: 'private-address', url };
  }

  return { allowed: true, url, addresses };
}
