import fs from 'fs';
import path from 'path';

describe('ExternalServicesController SQL hardening (SE-3930 KS-02)', () => {
  const source = fs.readFileSync(path.join(__dirname, 'external_services.ts'), 'utf8');

  it('does not contain the removed rpzmSoap handlers', () => {
    expect(source).not.toMatch(/rpzm/i);
  });

  it('does not run raw SQL with request data interpolated into it', () => {
    expect(source).not.toMatch(/\.query\(\s*`/);
  });
});
