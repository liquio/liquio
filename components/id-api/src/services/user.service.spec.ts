jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: jest.fn() }) } }));
jest.mock('.', () => ({ Services: { service: jest.fn() } }));
jest.mock('../models', () => ({ Models: {} }));

import { UserService } from './user.service';

describe('UserService.extractUpdateUserInfoParams (email, ID-08)', () => {
  const build = (modules: Record<string, any> = {}) => new UserService({ modules } as any, {} as any, {} as any);
  const extract = (body: Record<string, any>, modules?: Record<string, any>) =>
    build(modules).extractUpdateUserInfoParams({ body } as any, ['gender', 'email']);

  it('rejects an email in the generic update', () => {
    expect(() => extract({ email: 'a@b.test' })).toThrow('Email can only be changed');
  });

  it.each([{ isValidEmail: 'true' }, { isValidEmail: true }, { valid: { email: 'true' } }, { valid: { email: true } }])(
    'rejects self-declared email verification %j',
    (body) => {
      expect(() => extract(body, { denyToUpdateUserValidParams: false })).toThrow('Email confirmation requires a valid confirmation code');
    },
  );

  it('forces valid.email=false when the caller sends false', () => {
    expect(extract({ isValidEmail: 'false' }).valid).toEqual({ email: false });
  });

  it('leaves validity untouched for unrelated updates', () => {
    const query = extract({ gender: 'male' });
    expect(query.gender).toBe('male');
    expect(query.valid).toBeUndefined();
  });
});

describe('UserService.extractUpdateUserInfoParams (2FA, ID-09)', () => {
  const extract = (body: Record<string, any>) =>
    new UserService({ modules: {} } as any, {} as any, {} as any).extractUpdateUserInfoParams({ body } as any, [
      'gender',
      'useTwoFactorAuth',
      'twoFactorType',
    ]);

  it('does not touch 2FA settings when the fields are omitted', () => {
    const query = extract({ gender: 'male' });
    expect(query).not.toHaveProperty('useTwoFactorAuth');
    expect(query).not.toHaveProperty('twoFactorType');
  });

  it.each([
    [
      { useTwoFactorAuth: 'true', twoFactorType: 'totp' },
      { useTwoFactorAuth: true, twoFactorType: 'totp' },
    ],
    [{ useTwoFactorAuth: 'false' }, { useTwoFactorAuth: false }],
    [
      { useTwoFactorAuth: true, twoFactorType: 'sms' },
      { useTwoFactorAuth: true, twoFactorType: null },
    ],
  ])('applies explicitly submitted 2FA fields %j', (body, expected) => {
    expect(extract({ gender: 'male', ...body })).toMatchObject(expected);
  });
});
