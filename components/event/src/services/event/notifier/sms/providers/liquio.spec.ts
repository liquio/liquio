import nock from 'nock';

import { LiquioProvider } from './liquio';
import { setAppContext, resetAppContext } from '../../../../../lib/context';

jest.mock('@liquio/back-core', () => ({
  getTraceId: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  Sandbox: { getInstance: jest.fn(() => ({})) },
}));

const SERVER = 'http://notify.test';

describe('SMS LiquioProvider logging', () => {
  afterEach(() => resetAppContext());

  it('does not log phones or message text', async () => {
    const provider = new LiquioProvider({
      server: SERVER,
      port: 80,
      routes: { sendSms: '/sms' },
      timeout: 1000,
      user: 'u',
      password: 'p',
    });
    const saved: any[] = [];
    setAppContext({ log: { save: jest.fn((type, data) => saved.push({ type, data })) } });
    nock(SERVER).post('/sms').reply(200, { ok: true });

    await provider.send(['+380501112233', '+380509998877'], 'SECRET-SMS-TEXT', 'SECRET-TRANSLIT');

    const logged = JSON.stringify(saved);
    for (const secret of ['380501112233', '380509998877', 'SECRET-SMS-TEXT', 'SECRET-TRANSLIT']) {
      expect(logged).not.toContain(secret);
    }
    expect(saved.find((s) => s.type === 'sms-sending-request').data).toEqual({ phonesCount: 2, messageLength: 'SECRET-SMS-TEXT'.length });
  });
});
