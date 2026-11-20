import * as fs from 'node:fs';
import * as path from 'node:path';

import { Config as ConfigLoader } from '@liquio/back-core';

import { persistLinkConfigSchema } from './config.schema';

const SENTINEL = 'Basic c2VudGluZWw6c2VudGluZWwtc2VjcmV0';
const base = () => ({ db: { database: 'x' }, server: { port: 3000 } });

const issuesOf = (raw: unknown): { path: string; message: string }[] => {
  try {
    ConfigLoader.fromObject(raw as Record<string, unknown>, { schema: persistLinkConfigSchema });
  } catch (error) {
    expect((error as { code?: string }).code).toBe('CONFIG_VALIDATION');
    return (error as { issues: { path: string; message: string }[] }).issues;
  }
  return [];
};

describe('persistLinkConfigSchema', () => {
  it('accepts the shipped template', () => {
    const dir = path.join(__dirname, '..', '..', '..', '..', 'config-templates', 'persist-link');
    const raw: Record<string, unknown> = {};
    for (const file of fs.readdirSync(dir)) {
      raw[file.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    }

    expect(issuesOf(raw)).toEqual([]);
  });

  it('accepts a minimal config and keeps unknown keys', () => {
    const raw = { ...base(), extra: { a: 1 }, _db: {}, server: { port: '3000', other: true } };
    const config = ConfigLoader.fromObject(raw, { schema: persistLinkConfigSchema });

    expect(config.toObject()).toEqual(raw);
  });

  it.each(['db', 'server'])('requires %s', (key) => {
    const raw: Record<string, unknown> = base();
    delete raw[key];

    expect(issuesOf(raw).map((i) => i.path)).toContain(key);
  });

  it('does not leak values into messages', () => {
    let message = '';
    try {
      ConfigLoader.fromObject({ pdf_generator: { basicAuthToken: SENTINEL, requestTimeout: {} } }, { schema: persistLinkConfigSchema });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('Invalid config');
    expect(message).not.toContain(SENTINEL);
  });
});
