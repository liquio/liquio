// Very basic helper for asserting that auth-protected routes reject
// unauthenticated requests. Path params (":id" etc.) are filled with a
// fixed placeholder value since we only care that the route is matched
// and that auth middleware runs before validators/controllers.
const PLACEHOLDER = 'placeholder';

export function fillRouteParams(url: string): string {
  return url.replace(/:[A-Za-z_]+/g, PLACEHOLDER);
}

/**
 * Assert that calling `method url` without a `token` header returns 401.
 * Matches getCheckMiddleware's behavior in controllers/auth.ts: any route
 * with a non-empty `auth` array immediately rejects requests missing the
 * `token` header, before validators or controller logic run.
 */
export async function expectAuthRequired(app, method: string, url: string) {
  const filledUrl = fillRouteParams(url);
  await app.request()[method.toLowerCase()](filledUrl).expect(401);
}
