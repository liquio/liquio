import fs from 'node:fs';
import path from 'node:path';

describe('unauthenticated logs broadcasting WebSocket server', () => {
  it('is removed from the code base', () => {
    expect(fs.existsSync(path.join(__dirname, 'logs_broadcasting.ts'))).toBe(false);
  });

  it('is not wired into the index.ts bootstrap', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8');
    expect(source).not.toMatch(/logs_?broadcasting/i);
  });
});
