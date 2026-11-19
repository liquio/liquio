import * as fs from 'node:fs';
import * as path from 'node:path';

import { Config as ConfigLoader } from '@liquio/back-core';

import { pdfGeneratorConfigSchema } from './config.schema';

const toToken = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`;
const validToken = toToken('user:a-long-random-secret-1');
const base = () => ({ server: { port: 3000 }, auth: { basicAuthTokens: [validToken] } });

const issuesOf = (raw: unknown): { path: string; message: string }[] => {
  try {
    ConfigLoader.fromObject(raw as Record<string, unknown>, { schema: pdfGeneratorConfigSchema });
  } catch (error) {
    expect((error as { code?: string }).code).toBe('CONFIG_VALIDATION');
    return (error as { issues: { path: string; message: string }[] }).issues;
  }
  return [];
};

describe('pdfGeneratorConfigSchema', () => {
  it('accepts the shipped template with a valid token', () => {
    const dir = path.join(__dirname, '..', '..', '..', '..', 'config-templates', 'pdf-generator');
    const raw: Record<string, unknown> = {};
    for (const file of fs.readdirSync(dir)) {
      raw[file.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    }
    raw.auth = { basicAuthTokens: [validToken] };

    expect(issuesOf(raw)).toEqual([]);
  });

  it('accepts a minimal config and keeps unknown keys', () => {
    const raw = { ...base(), extra: { a: 1 }, server: { port: '3000', other: true } };
    const config = ConfigLoader.fromObject(raw, { schema: pdfGeneratorConfigSchema });

    expect(config.toObject()).toEqual(raw);
  });

  it('requires server', () => {
    expect(issuesOf({ auth: base().auth }).map((i) => i.path)).toContain('server');
  });

  it.each([undefined, null, 'token', [], {}])('rejects missing or empty tokens: %p', (value) => {
    const issues = issuesOf({ server: { port: 1 }, auth: { basicAuthTokens: value } });

    expect(issues.some((i) => i.path.startsWith('auth.basicAuthTokens') && i.message.includes('at least one token'))).toBe(true);
  });

  it('reports a missing auth section on the tokens path', () => {
    expect(issuesOf({ server: { port: 1 } })).toEqual([expect.objectContaining({ path: 'auth.basicAuthTokens' })]);
  });

  it('rejects the publicly known default token', () => {
    const issues = issuesOf({ ...base(), auth: { basicAuthTokens: ['Basic dXNlcm5hbWU6cGFzc3dvcmQ='] } });

    expect(issues).toEqual([expect.objectContaining({ path: 'auth.basicAuthTokens.0', message: expect.stringContaining('publicly known default') })]);
  });

  it('rejects malformed tokens', () => {
    const issues = issuesOf({ ...base(), auth: { basicAuthTokens: ['Bearer abc', toToken('no-colon-here-0123456789'), 42] } });

    expect(issues.map((i) => i.path)).toEqual(['auth.basicAuthTokens.0', 'auth.basicAuthTokens.1', 'auth.basicAuthTokens.2']);
    expect(issues.every((i) => i.message.includes('must be "Basic'))).toBe(true);
  });

  it('rejects empty passwords', () => {
    const issues = issuesOf({ ...base(), auth: { basicAuthTokens: [toToken('user:')] } });

    expect(issues).toEqual([expect.objectContaining({ path: 'auth.basicAuthTokens.0', message: expect.stringContaining('must not be empty') })]);
  });

  it('does not leak token values in error messages', () => {
    const token = 'Basic c2VudGluZWw6';
    let message = '';
    try {
      ConfigLoader.fromObject({ ...base(), auth: { basicAuthTokens: [token] } }, { schema: pdfGeneratorConfigSchema });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).not.toBe('');
    expect(message).not.toContain(token);
  });

  it('accepts passwords with colons', () => {
    expect(issuesOf({ ...base(), auth: { basicAuthTokens: [validToken, toToken('svc:abc:def:0123456789')] } })).toEqual([]);
  });
});
