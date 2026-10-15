import { HttpProvider } from './http.provider';

describe('HttpProvider logging', () => {
  const logger = { debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  let provider: HttpProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new HttpProvider(logger as any, { baseUrl: 'http://localhost' });
    jest.spyOn(provider as any, 'request').mockResolvedValue({ status: 200, data: {} });
  });

  const allLogged = () => JSON.stringify([...logger.debug.mock.calls, ...logger.error.mock.calls, ...logger.log.mock.calls]);

  it('does not log request body values (ipn/edrpou) on debug', async () => {
    const body = { url: '/x', params: { ipn: '1234567890' }, userFilter: { ipn: '1234567890', edrpou: '12345678' } };
    for (const m of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      await provider[m](body as any);
    }
    expect(logger.debug).toHaveBeenCalled();
    for (const [, payload] of logger.debug.mock.calls) {
      expect(payload).not.toHaveProperty('requestBody');
    }
    expect(allLogged()).not.toContain('1234567890');
    expect(allLogged()).not.toContain('12345678"');
  });

  it('does not log targetBody on validation failure', async () => {
    await expect(provider.get({ extraParams: { ipn: '1234567890' } } as any)).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith('http-provider|validate-failed', expect.not.objectContaining({ targetBody: expect.anything() }));
    expect(allLogged()).not.toContain('1234567890');
  });
});
