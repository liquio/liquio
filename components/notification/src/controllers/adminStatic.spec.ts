import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const componentRoot = path.join(__dirname, '..', '..');

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

describe('admin static assets', () => {
  const files = ['admin', 'src/admin'].flatMap((dir) => listFiles(path.join(componentRoot, dir))).filter((file) => /\.(js|html)$/.test(file));

  it('finds admin assets in both trees', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((file) => [path.relative(componentRoot, file), file]))('%s contains no embedded credentials', (_name, file) => {
    const content = readFileSync(file, 'utf8');
    expect(content).not.toMatch(/Basic\s/);
    expect(content).not.toMatch(/basicAuth/i);
    expect(content).not.toContain('kyiv-notify');
  });
});
