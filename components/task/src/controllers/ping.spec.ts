import { PingController } from './ping';
import { HttpRequest } from '../lib/http_request';

describe('PingController.sendPingRequest monitoring token', () => {
  const makeController = (): any => {
    const controller = Object.create(PingController.prototype);
    controller.token = 'service-token';
    controller.prepareResponse = jest.fn().mockReturnValue({ message: 'pong' });
    return controller;
  };

  beforeEach(() => {
    (global as any).log = { save: jest.fn() };
    jest.spyOn(HttpRequest, 'send').mockResolvedValue({ response: {}, body: {} } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends x-monitoring-token when configured and keeps the token header', async () => {
    await makeController().sendPingRequest('http://manager/test/ping', 'mon-secret');
    const { headers } = (HttpRequest.send as jest.Mock).mock.calls[0][0];
    expect(headers['x-monitoring-token']).toBe('mon-secret');
    expect(headers.token).toBe('service-token');
  });

  it.each([[undefined], ['']])('does not send x-monitoring-token when not configured (%p)', async (value) => {
    await makeController().sendPingRequest('http://id/test/ping', value);
    const { headers } = (HttpRequest.send as jest.Mock).mock.calls[0][0];
    expect(headers).not.toHaveProperty('x-monitoring-token');
    expect(headers.token).toBe('service-token');
  });
});
