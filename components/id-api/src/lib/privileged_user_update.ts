// Fields of `PUT /user/info/:id` that change who the user is or how they authenticate (KS-24).
export const PRIVILEGED_USER_FIELDS = ['role', 'isActive', 'useTwoFactorAuth', 'twoFactorType'] as const;

// Fields that must go through the verified flows (ID-08 email, ID-07 phone), never the generic update.
export const VERIFIED_FLOW_FIELDS = ['email', 'phone'] as const;

export interface UpdateServiceClient {
  name: string;
  scopes: string[];
  legacy: boolean;
}

export interface UpdateRejection {
  status: number;
  message: string;
}

const isDefined = (value: unknown) => typeof value !== 'undefined';

export function changedPrivilegedFields(body: Record<string, any>): string[] {
  return PRIVILEGED_USER_FIELDS.filter((field) => isDefined(body[field]));
}

/**
 * Check a generic user update coming from a named service client.
 * The legacy shared secret is not checked here, it keeps today's behaviour until it is removed.
 */
export function checkNamedClientUpdate(
  body: Record<string, any>,
  client: UpdateServiceClient,
  allowedRoles: string[] = [],
): UpdateRejection | undefined {
  if (VERIFIED_FLOW_FIELDS.some((field) => isDefined(body[field]))) {
    return { status: 400, message: 'Email and phone can only be changed through the verified flows' };
  }

  const privileged = changedPrivilegedFields(body);
  if (!privileged.length) return undefined;

  if (!client.scopes.includes('user:admin')) {
    return { status: 403, message: `Fields ${privileged.join(', ')} require the user:admin scope` };
  }

  if (isDefined(body.role)) {
    const roles = typeof body.role === 'string' ? body.role.split(';').map((role) => role.trim()) : [];
    if (!roles.length || roles.some((role) => !role || !allowedRoles.includes(role))) {
      return { status: 400, message: 'Role is not allowed' };
    }
  }

  return undefined;
}

/**
 * Author recorded in `user_admin_actions.created_by` for an update made by a named service client.
 * Always names the service. A client holding `user:admin` (a service that already acts for admins, such as admin-api)
 * may also attest the human initiator: only `userId` and `name` of an object `updateInitiator` are kept, so the
 * admin journal still shows who acted. Any other client, and any non-object initiator, is ignored.
 */
export function buildNamedClientAuthor(client: UpdateServiceClient, initiator: unknown): Record<string, unknown> {
  const author: Record<string, unknown> = { service: client.name };
  if (!client.scopes.includes('user:admin') || !initiator || typeof initiator !== 'object' || Array.isArray(initiator)) return author;

  const { userId, name } = initiator as Record<string, unknown>;
  return {
    ...(typeof userId === 'string' && userId ? { userId } : {}),
    ...(typeof name === 'string' && name ? { name } : {}),
    ...author,
  };
}
