import crypto from 'crypto';

jest.mock('./base_service', () => ({
  BaseService: class MockBaseService {
    config: any;
    constructor(config: any) {
      this.config = config;
    }
  },
}));

import { PasswordManagerService } from './password_manager.service';

describe('PasswordManagerService reset tokens', () => {
  const service = new (PasswordManagerService as any)({ passwordManager: {} }) as PasswordManagerService;

  afterEach(() => jest.restoreAllMocks());

  it('generates 32 alphanumeric characters by default', () => {
    expect(service.generateSecureToken()).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it('honours the requested length', () => {
    expect(service.generateSecureToken(16)).toHaveLength(16);
    expect(service.generateSecureToken(64)).toMatch(/^[A-Za-z0-9]{64}$/);
  });

  it('does not repeat over many calls', () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => service.generateSecureToken()));
    expect(tokens.size).toBe(2000);
  });

  it('draws from crypto.randomInt and never from Math.random', () => {
    const mathRandom = jest.spyOn(Math, 'random');
    const randomInt = jest.spyOn(crypto, 'randomInt');
    service.generateSecureToken();
    expect(mathRandom).not.toHaveBeenCalled();
    expect(randomInt).toHaveBeenCalledTimes(32);
  });

  it.each([0, -1, 15, 16.5, NaN, Infinity])('rejects invalid length %p', (length) => {
    expect(() => service.generateSecureToken(length)).toThrow(RangeError);
  });

  it('hashes with sha256 and verifies in constant time', () => {
    const token = service.generateSecureToken();
    const hash = service.hashToken(token);
    expect(hash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(service.verifyToken(token, hash)).toBe(true);
    expect(service.verifyToken(`${token}x`, hash)).toBe(false);
    expect(service.verifyToken(hash, hash)).toBe(false);
  });

  it.each([undefined, null, '', 123, {}])('rejects malformed input %p', (value) => {
    expect(service.verifyToken(value, service.hashToken('a'))).toBe(false);
    expect(service.verifyToken('a', value)).toBe(false);
  });

  it('rejects a stored value that is not a sha256 digest', () => {
    expect(service.verifyToken('a', 'zz')).toBe(false);
  });
});
