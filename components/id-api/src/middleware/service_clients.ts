import crypto from 'crypto';

/**
 * Scopes a `basic()` route can require. The legacy shared secret holds all of them.
 */
export const SERVICE_SCOPES = [
  'user:read',
  'user:write',
  'user:admin',
  'password:set',
  'totp',
  'login_history',
  'login_history:all',
  'login_history:pii',
] as const;

export type ServiceScope = (typeof SERVICE_SCOPES)[number];

export const LEGACY_CLIENT_NAME = 'legacy-shared-secret';

export interface ServiceClient {
  name: string;
  scopes: string[];
  // True for the identity built from `oauth.secret_key[]` (the shared pool secret).
  legacy: boolean;
  // Optional per-client page size cap (e.g. for `/login_history`).
  maxLimit?: number;
}

export interface BasicAuthClientConfig {
  name: string;
  // Plain secret, or `secret_hash` (hex SHA-256 of the secret). The caller sends `Basic base64(name:secret)`.
  secret?: string;
  secret_hash?: string;
  scopes?: string[];
  maxLimit?: number;
}

export interface BasicAuthConfig {
  // Accept `oauth.secret_key[]` as an identity with all scopes. Deprecated, default true.
  allowLegacySharedSecret?: boolean;
  clients?: BasicAuthClientConfig[];
}

const digest = (value: string): Buffer => crypto.createHash('sha256').update(value).digest();

// Both sides are SHA-256 digests (fixed length), so the comparison does not leak length or content.
const equal = (a: Buffer, b: Buffer): boolean => crypto.timingSafeEqual(a, b);

/**
 * Registry of the identities allowed to call `basic()` routes.
 */
export class ServiceClientRegistry {
  private readonly clients: { name: string; nameDigest: Buffer; secretDigest: Buffer; scopes: string[]; maxLimit?: number }[];
  private readonly legacyDigests: Buffer[];
  readonly allowLegacy: boolean;

  constructor(config: BasicAuthConfig | undefined, legacySecrets: string[]) {
    this.allowLegacy = config?.allowLegacySharedSecret !== false;
    this.legacyDigests = this.allowLegacy ? legacySecrets.map(digest) : [];

    const names = new Set<string>();
    this.clients = (config?.clients ?? []).map((client) => {
      if (!client?.name || typeof client.name !== 'string' || client.name.includes(':')) {
        throw new Error('basic_auth.clients: every client needs a name without ":"');
      }
      if (names.has(client.name)) {
        throw new Error(`basic_auth.clients: duplicate client "${client.name}"`);
      }
      names.add(client.name);

      let secretDigest: Buffer;
      if (client.secret_hash) {
        if (!/^[0-9a-f]{64}$/i.test(client.secret_hash)) {
          throw new Error(`basic_auth.clients: secret_hash of "${client.name}" must be a hex SHA-256`);
        }
        secretDigest = Buffer.from(client.secret_hash, 'hex');
      } else if (client.secret) {
        secretDigest = digest(client.secret);
      } else {
        throw new Error(`basic_auth.clients: client "${client.name}" needs secret or secret_hash`);
      }

      const scopes = client.scopes ?? [];
      const unknown = scopes.filter((scope) => !(SERVICE_SCOPES as readonly string[]).includes(scope));
      if (unknown.length) {
        throw new Error(`basic_auth.clients: client "${client.name}" has unknown scopes ${unknown.join(', ')}`);
      }

      if (client.maxLimit !== undefined && (!Number.isInteger(client.maxLimit) || client.maxLimit < 1)) {
        throw new Error(`basic_auth.clients: client "${client.name}" maxLimit must be a positive integer`);
      }

      return { name: client.name, nameDigest: digest(client.name), secretDigest, scopes: [...scopes], maxLimit: client.maxLimit };
    });
  }

  /**
   * Resolve the identity for a decoded `user:secret` credential. Every candidate is compared, none short-circuits.
   */
  authenticate(incoming: string): ServiceClient | undefined {
    const separator = incoming.indexOf(':');
    const username = separator === -1 ? incoming : incoming.slice(0, separator);
    const secret = separator === -1 ? '' : incoming.slice(separator + 1);
    const usernameDigest = digest(username);
    const secretDigest = digest(secret);
    const incomingDigest = digest(incoming);

    let found: ServiceClient | undefined;
    for (const client of this.clients) {
      const matches = equal(usernameDigest, client.nameDigest) && equal(secretDigest, client.secretDigest);
      if (matches) found = { name: client.name, scopes: client.scopes, legacy: false, maxLimit: client.maxLimit };
    }

    let legacyMatch = false;
    for (const legacyDigest of this.legacyDigests) {
      if (equal(incomingDigest, legacyDigest)) legacyMatch = true;
    }

    if (found) return found;
    if (legacyMatch) return { name: LEGACY_CLIENT_NAME, scopes: [...SERVICE_SCOPES], legacy: true };
    return undefined;
  }
}
