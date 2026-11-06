import fs from 'node:fs';
import path from 'node:path';

import { urlForLog } from './external_reader';

describe('config is never logged', () => {
  it('create-pdf does not log global.config', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'businesses', 'document', 'files.ts'), 'utf8');
    expect(source).not.toMatch(/global\.log\.save\([^)]*global\.config/);
  });

  it('eslint config declares the noConfigInLogs guard', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'eslint.config.js'), 'utf8');
    expect(source).toContain('noConfigInLogs');
  });

  describe('urlForLog', () => {
    it('removes userinfo and query string', () => {
      expect(urlForLog('https://user:pass@example.com/a/b?token=secret')).toBe('https://example.com/a/b');
    });

    it('returns a placeholder for an invalid url', () => {
      expect(urlForLog('not a url')).toBe('[invalid-url]');
    });
  });
});
