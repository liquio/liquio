export interface UserIdQuery {
  access_token?: string;
  user_id?: string | number;
  [key: string]: any;
}

export type CheckToken = (token: string) => Promise<{ _id?: string | number } | undefined | null>;

/**
 * Build an error carrying the HTTP status in the shape used by message handlers (`res.send(e.statusCode, e.error)`).
 */
function identityError(statusCode: number, message: string): Error & { statusCode: number; error: { message: string } } {
  return Object.assign(new Error(message), { statusCode, error: { message } });
}

/**
 * Resolve the user whose messages a request acts on.
 *
 * A validated `access_token` always wins: the user is the token owner and a `user_id` query param can never override it.
 * `user_id` is honoured only when no token is given. Callers must be behind `checkAuth` (Basic service credentials),
 * so that only trusted services can act on behalf of an arbitrary user.
 * @param query Request query.
 * @param checkToken Token validator returning the user (with `_id`).
 * @returns User ID.
 * @throws 400 when no identity is given, 401 when the token is invalid.
 */
export async function resolveUserId(query: UserIdQuery | undefined, checkToken: CheckToken): Promise<string | number> {
  const { access_token: accessToken, user_id: queryUserId } = query || {};

  if (accessToken) {
    const user = await checkToken(String(accessToken));
    if (!user || user._id === undefined || user._id === null || user._id === '') {
      throw identityError(401, 'Access token is not valid.');
    }
    return user._id;
  }

  if (queryUserId !== undefined && queryUserId !== null && queryUserId !== '') {
    return queryUserId;
  }

  throw identityError(400, 'Access token or user id should be defined.');
}
