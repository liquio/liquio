import crypto from 'node:crypto';

const findAll = jest.fn();
const create = jest.fn();

jest.mock('../models/links', () => ({
  __esModule: true,
  default: class {
    model = { findAll, create };
  },
}));
jest.mock('./context', () => ({ getLog: () => ({ save: jest.fn() }) }));

import LinkGenerator from './link_generator';

const KEY = '12345678901234567890123456789012';
const IV = '1234567890123456';

const make = (key = KEY): any => {
  (LinkGenerator as any).singleton = undefined;
  return new LinkGenerator({ secretKey: key, cryptIv: IV });
};

describe('LinkGenerator encryption', () => {
  beforeEach(() => {
    findAll.mockReset();
    create.mockReset();
  });

  it('roundtrips V2 with version prefix', () => {
    const g = make();
    const enc = g.encrypt('{"a":1}');
    expect(enc.startsWith('2.')).toBe(true);
    expect(g.decrypt(enc)).toBe('{"a":1}');
  });

  it('produces different ciphertext for the same data', () => {
    const g = make();
    expect(g.encrypt('same')).not.toBe(g.encrypt('same'));
  });

  it('rejects tampered ciphertext', () => {
    const g = make();
    const enc = g.encrypt('{"a":1}');
    const raw = Buffer.from(enc.slice(2), 'base64url');
    raw[14] ^= 1;
    expect(() => g.decrypt('2.' + raw.toString('base64url'))).toThrow();
    expect(() => g.decrypt('2.AAAA')).toThrow();
  });

  it('still decrypts legacy CBC hashes', () => {
    const g = make();
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
    const legacy = cipher.update('{"legacy":true}', 'utf8', 'hex') + cipher.final('hex');
    expect(g.decrypt(legacy)).toBe('{"legacy":true}');
  });

  it('fails with a wrong key', () => {
    const enc = make().encrypt('x');
    expect(() => make('abcdefghijklmnopqrstuvwxyz123456').decrypt(enc)).toThrow();
  });

  it('defineDataByLink maps any decrypt failure to one generic error', async () => {
    const g = make();
    const good = g.encrypt('{"type":"simple"}');
    findAll.mockResolvedValueOnce([{ dataValues: { data: good.slice(0, -2) + 'AA' } }]);
    await expect(g.defineDataByLink('http://x/abc')).rejects.toThrow('Data to decrypt not found.');
    findAll.mockResolvedValueOnce([{ dataValues: { data: 'zz-not-hex' } }]);
    await expect(g.defineDataByLink('abc')).rejects.toThrow('Data to decrypt not found.');
    findAll.mockResolvedValueOnce([{ dataValues: { data: good } }]);
    await expect(g.defineDataByLink('abc')).resolves.toEqual({ type: 'simple' });
  });

  it('generateLinkByData stores V2 data for small links', async () => {
    const g = make();
    await g.generateLinkByData({ type: 'simple', options: {}, small: true });
    expect(create.mock.calls[0][0].data.startsWith('2.')).toBe(true);
  });
});
