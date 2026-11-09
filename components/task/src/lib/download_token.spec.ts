import jwt from 'jsonwebtoken';

import { DownloadToken } from './download_token';
import { ForbiddenError } from './errors';
import { ErrorMessage } from '../constants/error';

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
    expect(service.decrypt(service.generate('file-1', 'user-1'), 'user-1')).toBe('file-1');
  });

  describe('decrypt rejections', () => {
    const expectForbidden = (fn: () => unknown) => {
      try {
        fn();
      } catch (error: any) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error.httpStatusCode).toBe(403);
        expect(error.message).toBe(ErrorMessage.DownloadTokenInvalid);
        return;
      }
      throw new Error('Expected to throw');
    };

    it('should reject another user', () => {
      const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
      expectForbidden(() => service.decrypt(service.generate('file-1', 'user-1'), 'user-2'));
    });

    it('should reject a legacy token without userId', () => {
      const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
      expectForbidden(() => service.decrypt(jwt.sign({ fileId: 'x' }, GOOD_SECRET), 'user-1'));
    });

    it('should reject an expired token', () => {
      const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
      const token = jwt.sign({ fileId: 'x', userId: 'user-1' }, GOOD_SECRET, { expiresIn: -1 });
      expectForbidden(() => service.decrypt(token, 'user-1'));
    });

    it('should reject a garbage token', () => {
      const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
      expectForbidden(() => service.decrypt('garbage', 'user-1'));
    });

    it('should reject an empty request userId', () => {
      const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
      const token = service.generate('file-1', 'user-1');
      expectForbidden(() => service.decrypt(token, ''));
      expectForbidden(() => service.decrypt(token, undefined as any));
    });
  });

  it('should refuse to generate without fileId or userId', () => {
    const service = new DownloadToken({ jwtSecret: GOOD_SECRET });
    expect(() => (service as any).generate('f')).toThrow('required');
    expect(() => service.generate('', 'u')).toThrow('required');
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
    expect(() => service.decrypt(forged, 'user-1')).toThrow();
  });
});
