jest.mock('../middleware/authenticate', () => ({ AuthMiddleware: { get: jest.fn().mockReturnValue({}) } }));
jest.mock('../models', () => ({ Models: { model: jest.fn() } }));
jest.mock('../services', () => ({ Services: { service: jest.fn() } }));
jest.mock('@liquio/back-core', () => {
  const instance = { save: jest.fn() };
  return { Log: { getInstance: () => instance }, getTraceId: jest.fn(), appendTraceMeta: jest.fn() };
});

import { BaseController } from './base_controller';

describe('BaseController.prepareLoginHistoryData', () => {
  const controller = new BaseController({} as any, { config: {} } as any, 'test');
  const request = (extra: Record<string, any>) =>
    ({
      user: { userId: 'u1', first_name: 'A', last_name: 'B' },
      session: { client: {} },
      headers: { 'x-forwarded-for': '6.6.6.6', 'user-agent': 'ua' },
      socket: { remoteAddress: '10.0.0.1' },
      ...extra,
    }) as any;

  it('uses req.ip (proxy-resolved) and ignores the raw X-Forwarded-For header', () => {
    const data = controller.prepareLoginHistoryData(request({ ip: '203.0.113.7' }), {});
    expect(data?.ip).toEqual(['203.0.113.7']);
  });

  it('falls back to the socket address when req.ip is unavailable', () => {
    const data = controller.prepareLoginHistoryData(request({ ip: undefined }), {});
    expect(data?.ip).toEqual(['10.0.0.1']);
  });
});
