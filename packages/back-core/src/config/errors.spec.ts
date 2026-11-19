import { ConfigLoadError, ConfigValidationError } from './errors';

describe('config errors', () => {
  it('ConfigLoadError has name and code and no cause', () => {
    const err = new ConfigLoadError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ConfigLoadError');
    expect(err.code).toBe('CONFIG_LOAD');
    expect(err.message).toBe('boom');
    expect('cause' in err).toBe(false);
  });

  it('ConfigValidationError has name, code, issues and composed message', () => {
    const issues = [
      { path: 'server.port', code: 'invalid_type', message: 'bad' },
      { path: '', code: 'custom', message: 'root bad' },
    ];
    const err = new ConfigValidationError(issues);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ConfigValidationError');
    expect(err.code).toBe('CONFIG_VALIDATION');
    expect(err.issues).toEqual(issues);
    expect(err.message).toBe('Invalid config: server.port: bad; (root): root bad');
    expect('cause' in err).toBe(false);
  });
});
