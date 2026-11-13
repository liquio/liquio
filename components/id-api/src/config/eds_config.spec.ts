import { Config, validateEdsConfig } from './index';

function makeConfig(eds?: Record<string, any>): Config {
  return { auth_providers: eds ? { eds } : {} } as unknown as Config;
}

function validEds(overrides: Record<string, any> = {}) {
  return {
    isEnabled: true,
    clientID: 'client-id',
    clientSecret: 'client-secret',
    callbackURL: 'https://id.example.com/authorise/eds/callback',
    ...overrides,
  };
}

describe('validateEdsConfig', () => {
  it('passes when the provider is absent', () => {
    expect(() => validateEdsConfig(makeConfig())).not.toThrow();
  });

  it('passes when the provider is disabled and has no credentials', () => {
    expect(() => validateEdsConfig(makeConfig({ isEnabled: false }))).not.toThrow();
  });

  it('treats a provider without isEnabled as disabled', () => {
    expect(() => validateEdsConfig(makeConfig({ clientID: '<REDACTED>' }))).not.toThrow();
  });

  it('passes for a complete enabled config', () => {
    expect(() => validateEdsConfig(makeConfig(validEds()))).not.toThrow();
  });

  it.each(['clientID', 'clientSecret', 'callbackURL'])('fails when enabled without %s', (field) => {
    expect(() => validateEdsConfig(makeConfig(validEds({ [field]: undefined })))).toThrow(`${field} is required`);
    expect(() => validateEdsConfig(makeConfig(validEds({ [field]: '  ' })))).toThrow(`${field} is required`);
  });

  it.each(['<REDACTED>', 'REDACTED', 'changeme', '${EDS_SECRET}'])('rejects placeholder %s', (value) => {
    expect(() => validateEdsConfig(makeConfig(validEds({ clientSecret: value })))).toThrow('clientSecret must not be a placeholder');
  });
});
