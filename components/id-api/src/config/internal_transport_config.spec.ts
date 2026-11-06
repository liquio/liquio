import { Config, validateInternalTransportConfig } from './index';

const plain = (extra: Record<string, any> = {}) =>
  ({
    notify: { url: 'http://notification:80' },
    pingRoutes: { notify: 'http://notification:80/test/ping' },
    x509: { externalUrl: 'http://sign-tool:3004' },
    ...extra,
  }) as unknown as Config;

describe('validateInternalTransportConfig', () => {
  it('rejects plain http internal URLs in production and lists them', () => {
    expect(() => validateInternalTransportConfig(plain(), 'production')).toThrow(
      /notify\.url=http:\/\/notification:80.*pingRoutes\.notify=.*x509\.externalUrl=http:\/\/sign-tool:3004.*allowPlainHttp/,
    );
    expect(() => validateInternalTransportConfig(plain(), 'prod')).toThrow('Insecure internal service URLs');
  });

  it('rejects when allowPlainHttp is not exactly true', () => {
    expect(() => validateInternalTransportConfig(plain({ internalTransport: { allowPlainHttp: false } }), 'production')).toThrow();
  });

  it('allows plain http in production with the explicit opt-in', () => {
    expect(() => validateInternalTransportConfig(plain({ internalTransport: { allowPlainHttp: true } }), 'production')).not.toThrow();
  });

  it('allows https URLs in production', () => {
    const config = plain({
      notify: { url: 'https://notification' },
      pingRoutes: { notify: 'https://notification/test/ping' },
      x509: { externalUrl: 'HTTPS://sign-tool' },
    });
    expect(() => validateInternalTransportConfig(config, 'production')).not.toThrow();
  });

  it('does not restrict non-production environments', () => {
    expect(() => validateInternalTransportConfig(plain(), 'development')).not.toThrow();
    expect(() => validateInternalTransportConfig(plain(), 'localhost')).not.toThrow();
  });
});
