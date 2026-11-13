import { saveSession } from '../middleware/session';
import { Request } from '../types';

export type TwoFactorType = 'phone' | 'totp';

/**
 * Proof that the second factor was completed in the current login session.
 * Stored in the session outside of `passport.user`, so it is never part of the user profile.
 */
export interface TwoFactorCompletion {
  userId: string;
  factor: TwoFactorType;
}

/**
 * Read the user ID of the authenticated session user.
 */
export function getSessionUserId(req: Request): string | undefined {
  const user = req.session?.passport?.user;
  const userId = user?.userId ?? user?.user_id;
  return typeof userId === 'string' && userId ? userId : undefined;
}

/**
 * Mark the second factor as completed for the user of the current session.
 */
export async function markTwoFactorCompleted(req: Request, userId: string, factor: TwoFactorType): Promise<void> {
  const completion: TwoFactorCompletion = { userId, factor };
  req.session.twoFactorCompleted = completion;

  // Keep the legacy flags in sync for the clients that read them from the session user.
  const user = req.session.passport?.user;
  if (user) {
    if (factor === 'phone') user.phoneChecked = true;
    if (factor === 'totp') user.totpChecked = true;
  }

  await saveSession(req);
}

/**
 * Check that the session holds a completion marker of exactly this user and this factor.
 */
export function isTwoFactorCompleted(req: Request, userId: string, factor: TwoFactorType): boolean {
  const completion = req.session?.twoFactorCompleted;
  return !!completion && typeof completion === 'object' && completion.userId === userId && completion.factor === factor;
}

/**
 * Forget any second factor completion. Must be called on every new primary authentication.
 */
export function clearTwoFactorState(req: Request): void {
  if (!req.session) return;

  delete req.session.twoFactorCompleted;

  const user = req.session.passport?.user;
  if (user && typeof user === 'object') {
    delete user.phoneChecked;
    delete user.totpChecked;
  }
}
