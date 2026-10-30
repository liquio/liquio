import https from 'node:https';

import { NotifierService } from './notifier';
import { HttpRequest } from '../lib/http_request';
import { setAppContext } from '../lib/context';

jest.mock('@liquio/back-core', () => ({ getTraceId: () => 'trace' }));

const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';

describe('NotifierService internal transport', () => {
  it('passes the internal CA agent to every notification request', async () => {
    (global as any).log = { save: jest.fn() };
    (global as any).config = {
      notifier: { server: 'https://notification', port: 3003, user: 'u', password: 'p', routes: { toAll: '/message/toAll', ping: '/test/ping' } },
      internal_transport: { ca: PEM },
    };
    setAppContext({ config: (global as any).config });
    const send = jest.spyOn(HttpRequest, 'send').mockResolvedValue({} as any);
    const service = new NotifierService();

    await service.getMessagesForAllUsers(0, 1);
    await service.createMessageTemplate({ a: 1 });
    await service.sendPingRequest();

    expect(send).toHaveBeenCalledTimes(3);
    for (const [options] of send.mock.calls) {
      expect((options as any).httpsAgent).toBeInstanceOf(https.Agent);
      expect((options as any).httpsAgent.options.rejectUnauthorized).toBe(true);
    }
  });
});
