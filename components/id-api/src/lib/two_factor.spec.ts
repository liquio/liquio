import { clearTwoFactorState, getSessionUserId, isTwoFactorCompleted, markTwoFactorCompleted } from './two_factor';

jest.mock('../middleware/session', () => ({ saveSession: jest.fn().mockResolvedValue(undefined) }));

const request = (session: any) => ({ session }) as any;

describe('two_factor', () => {
  describe('getSessionUserId', () => {
    it('reads the user ID of the passport user', () => {
      expect(getSessionUserId(request({ passport: { user: { userId: 'u1' } } }))).toBe('u1');
      expect(getSessionUserId(request({ passport: { user: { user_id: 'u2' } } }))).toBe('u2');
    });

    it('returns undefined when there is no usable user ID', () => {
      expect(getSessionUserId(request({}))).toBeUndefined();
      expect(getSessionUserId(request({ passport: {} }))).toBeUndefined();
      expect(getSessionUserId(request({ passport: { user: { userId: '' } } }))).toBeUndefined();
      expect(getSessionUserId(request({ passport: { user: { userId: { $ne: 1 } } } }))).toBeUndefined();
    });
  });

  describe('markTwoFactorCompleted / isTwoFactorCompleted', () => {
    it('binds the marker to the user and the factor', async () => {
      const req = request({ passport: { user: { userId: 'u1' } } });

      await markTwoFactorCompleted(req, 'u1', 'totp');

      expect(req.session.twoFactorCompleted).toEqual({ userId: 'u1', factor: 'totp' });
      expect(isTwoFactorCompleted(req, 'u1', 'totp')).toBe(true);
    });

    it('rejects a marker of another user or another factor', async () => {
      const req = request({ passport: { user: { userId: 'u1' } } });
      await markTwoFactorCompleted(req, 'u1', 'phone');

      expect(isTwoFactorCompleted(req, 'u2', 'phone')).toBe(false);
      expect(isTwoFactorCompleted(req, 'u1', 'totp')).toBe(false);
    });

    it('rejects a missing or malformed marker', () => {
      expect(isTwoFactorCompleted(request({}), 'u1', 'phone')).toBe(false);
      expect(isTwoFactorCompleted(request({ twoFactorCompleted: true }), 'u1', 'phone')).toBe(false);
      expect(isTwoFactorCompleted(request({ twoFactorCompleted: 'u1' }), 'u1', 'phone')).toBe(false);
      expect(isTwoFactorCompleted(request({ twoFactorCompleted: { userId: ['u1'], factor: 'phone' } }), 'u1', 'phone')).toBe(false);
    });

    it('does not trust the legacy session user flags', () => {
      const req = request({ passport: { user: { userId: 'u1', phoneChecked: true, totpChecked: true } } });

      expect(isTwoFactorCompleted(req, 'u1', 'phone')).toBe(false);
      expect(isTwoFactorCompleted(req, 'u1', 'totp')).toBe(false);
    });
  });

  describe('clearTwoFactorState', () => {
    it('removes the marker and the legacy flags', () => {
      const req = request({
        twoFactorCompleted: { userId: 'u1', factor: 'phone' },
        passport: { user: { userId: 'u1', phoneChecked: true, totpChecked: true } },
      });

      clearTwoFactorState(req);

      expect(req.session.twoFactorCompleted).toBeUndefined();
      expect(req.session.passport.user).toEqual({ userId: 'u1' });
    });

    it('tolerates an empty session', () => {
      expect(() => clearTwoFactorState(request({}))).not.toThrow();
      expect(() => clearTwoFactorState({} as any)).not.toThrow();
    });
  });
});
