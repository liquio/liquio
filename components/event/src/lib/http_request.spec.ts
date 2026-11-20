import nock from 'nock';

import { HttpRequest } from './http_request';
import { setAppContext, resetAppContext, getLog } from './context';

describe('HttpRequest.send error message (EV-05c)', () => {
  beforeEach(() => setAppContext({ log: { save: jest.fn() } }));

  afterEach(() => {
    nock.cleanAll();
    resetAppContext();
  });

  it('masks secrets in the thrown message and in the log', async () => {
    nock('http://mock-host.test').get('/x').reply(400, { error: 'bad', access_token: 'tok-1' });
    const error: any = await HttpRequest.send({ method: 'GET', url: 'http://mock-host.test/x' }).catch((e) => e);
    expect(error.message).toContain('"error":"bad"');
    expect(error.message).not.toContain('tok-1');
    expect(JSON.stringify((getLog().save as jest.Mock).mock.calls)).not.toContain('tok-1');
  });

  it('cuts long bodies', async () => {
    nock('http://mock-host.test').get('/y').reply(500, 'z'.repeat(100000));
    const error: any = await HttpRequest.send({ method: 'GET', url: 'http://mock-host.test/y' }).catch((e) => e);
    expect(error.message.length).toBeLessThan(2200);
  });
});
