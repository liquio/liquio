import crypto from 'node:crypto';

import { validateAuthConfig, COMPROMISED_TOKEN_HASHES } from './config_validation';

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

describe('validateAuthConfig', () => {
  it('accepts a generated token', () => {
    expect(validateAuthConfig({ auth: { tokens: [basic(`filestorage:${crypto.randomBytes(24).toString('hex')}`)] } })).toEqual([]);
  });

  it('rejects missing, empty and non-array tokens', () => {
    expect(validateAuthConfig({})).toHaveLength(1);
    expect(validateAuthConfig({ auth: {} })).toHaveLength(1);
    expect(validateAuthConfig({ auth: { tokens: [] } })).toHaveLength(1);
    expect(validateAuthConfig({ auth: { tokens: 'Basic abc' } })).toHaveLength(1);
  });

  it('rejects non-string tokens', () => {
    const problems = validateAuthConfig({ auth: { tokens: [42, null] } });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/not a string/);
  });

  it('rejects malformed tokens', () => {
    const tokens = ['Bearer abc', 'Basic', 'Basic a b', basic('no-password'), basic(':pass'), basic('user:'), basic('a:b:c')];
    expect(validateAuthConfig({ auth: { tokens } })).toHaveLength(tokens.length);
  });

  it('reports the index of the bad token only', () => {
    const problems = validateAuthConfig({ auth: { tokens: [basic('client:s3cret'), 'garbage'] } });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/auth\.tokens\[1\]/);
  });

  it('rejects the previously shipped tokens', () => {
    const shipped = [
      'Basic dGVzdDE6dGVzdA==',
      'Basic dGVzdDI6RWlUMndlZTRhb0hlZWg1ZW4zZUJhZTFpZWJhaHI1bnV2MWJhZWNoZWlob294NGFlbTVhaXM5dWQ0YWV3YWhuaQ==',
    ];
    for (const token of shipped) {
      expect(COMPROMISED_TOKEN_HASHES).toContain(sha256(token));
    }
    const problems = validateAuthConfig({ auth: { tokens: shipped } });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/publicly known/);
  });

  it('never leaks token values in problems', () => {
    const token = basic('client:s3cret-value');
    const problems = validateAuthConfig({ auth: { tokens: [`${token} extra`] } });
    expect(problems.some((problem) => problem.includes('s3cret-value') || problem.includes(token))).toBe(false);
  });
});
