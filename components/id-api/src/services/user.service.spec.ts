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

describe('UserService.extractUpdateUserInfoParams (token scope, GI-20)', () => {
  const FIELDS = () => ['gender', 'phone', 'birthday', 'twoFactorType', 'useTwoFactorAuth', 'foreigners_document_series'];
  const extract = (body: Record<string, any>, scope?: string[], modules: Record<string, any> = {}) =>
    new UserService({ modules } as any, {} as any, {} as any).extractUpdateUserInfoParams({ body } as any, FIELDS(), scope);

  it('rejects a field the scope does not cover', () => {
    expect(() => extract({ birthday: '2000-01-01', phone: '+380000000000' }, ['birthday'])).toThrow('Insufficient scope');
    try {
      extract({ birthday: '2000-01-01', phone: '+380000000000' }, ['birthday']);
    } catch (error: any) {
      expect(error.fields).toEqual(['phone']);
      expect(error.statusCode).toBe(403);
    }
  });

  it('rejects any write for a read-only scope', () => {
    expect(() => extract({ gender: 'male' }, ['userId', 'email'])).toThrow('Insufficient scope');
    expect(() => extract({ gender: 'male' }, [])).toThrow('Insufficient scope');
  });

  it('allows covered fields', () => {
    expect(extract({ birthday: '2000-01-01' }, ['birthday']).birthday).toBe('2000-01-01');
  });

  it('allows everything with profile:write', () => {
    expect(extract({ gender: 'male', birthday: '2000-01-01' }, ['profile:write'])).toMatchObject({ gender: 'male', birthday: '2000-01-01' });
  });

  it('covers fields without their own scope through the field they belong to', () => {
    expect(extract({ twoFactorType: 'totp' }, ['useTwoFactorAuth']).twoFactorType).toBe('totp');
    expect(() => extract({ twoFactorType: 'totp' }, ['birthday'])).toThrow('Insufficient scope');
  });

  it('does not let module-enabled fields bypass the scope', () => {
    expect(() => extract({ valid: { phone: false } }, ['gender'], { denyToUpdateUserValidParams: false })).toThrow('Insufficient scope');
    expect(() => extract({ first_name: 'A' }, ['gender'], { denyToUpdateUserName: false })).toThrow('Insufficient scope');
  });

  it('ignores fields not in the body', () => {
    expect(() => extract({}, [])).not.toThrow();
  });
});
