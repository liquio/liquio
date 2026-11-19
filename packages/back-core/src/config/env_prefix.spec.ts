import { resolveEnvPrefix } from './env_prefix';

describe('resolveEnvPrefix', () => {
  const saved = process.env.LIQUIO_CONFIG_PREFIX;

  afterEach(() => {
    if (saved === undefined) delete process.env.LIQUIO_CONFIG_PREFIX;
    else process.env.LIQUIO_CONFIG_PREFIX = saved;
  });

  it('uses the default base', () => {
    delete process.env.LIQUIO_CONFIG_PREFIX;
    expect(resolveEnvPrefix('LIQUIO_CFG_GATEWAY')).toBe('LIQUIO_CFG_GATEWAY_');
  });

  it('honours LIQUIO_CONFIG_PREFIX at call time', () => {
    process.env.LIQUIO_CONFIG_PREFIX = 'CUSTOM';
    expect(resolveEnvPrefix('LIQUIO_CFG_GATEWAY')).toBe('CUSTOM_');
  });

  it('falls back when LIQUIO_CONFIG_PREFIX is empty', () => {
    process.env.LIQUIO_CONFIG_PREFIX = '';
    expect(resolveEnvPrefix('LIQUIO_CFG_GATEWAY')).toBe('LIQUIO_CFG_GATEWAY_');
  });

  it('appends the suffix', () => {
    delete process.env.LIQUIO_CONFIG_PREFIX;
    expect(resolveEnvPrefix('LIQUIO_CFG_ADMIN_API', 'HANDLER_')).toBe('LIQUIO_CFG_ADMIN_API_HANDLER_');
  });
});
