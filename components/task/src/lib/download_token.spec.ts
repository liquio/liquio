import { DownloadToken } from './download_token';

const GOOD_SECRET = 'Zk3p9QwLm2Xv8RtYh5Nc7Bd1';

describe('DownloadToken', () => {
  beforeEach(() => {
    (DownloadToken as any).singleton = undefined;
  });

  afterAll(() => {
    (DownloadToken as any).singleton = undefined;
  });

  it('should generate and decrypt a token round-trip', () => {
    const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
    expect(service.decrypt(service.generate('file-1'))).toBe('file-1');
  });

  it.each(['<removed>', '<REDACTED>', '<anything>', 'REDACTED', 'changeme', 'secret', '  <removed> '])(
    'should refuse placeholder %p',
    (jwtSecret) => {
      expect(() => new DownloadToken({ jwtSecret })).toThrow(/placeholder|too short/);
    },
  );

  it('should refuse empty and short secrets', () => {
    expect(() => new DownloadToken({})).toThrow('JWT secret is required');
    expect(() => new DownloadToken({ jwtSecret: 'short-key' })).toThrow('too short');
  });

  it('should not accept tokens forged with the old placeholder key', () => {
    const forged = require('jsonwebtoken').sign({ fileId: 'x' }, '<removed>');
    const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
    expect(() => service.decrypt(forged)).toThrow();
  });
});
