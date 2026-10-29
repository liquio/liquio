import dns from 'dns';

import { INestApplication } from '@nestjs/common';
import nock from 'nock';

import { createApp, postPdf } from './helpers/app';
import { captureLogs } from './helpers/log-capture';
import { expectPdf } from './helpers/pdf';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const page = (src: string) => `<html><body><img src="${src}"></body></html>`;

describe('Resource blocking and URL guard (e2e)', () => {
  let app: INestApplication;
  let logs: ReturnType<typeof captureLogs>;

  beforeAll(async () => {
    app = await createApp();
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1|localhost/);
  });

  beforeEach(() => {
    logs = captureLogs();
  });

  afterEach(() => {
    logs.restore();
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  afterAll(async () => {
    nock.enableNetConnect();
    await app.close();
  });

  const expectBlocked = (reason: string) => {
    const blocked = logs.byType('pdf-generator|request-blocked');
    expect(blocked.some((line) => line.data.reason === reason)).toBe(true);
  };

  it('allows data: images', async () => {
    expectPdf(await postPdf(app, { html: page(`data:image/png;base64,${PNG.toString('base64')}`) }));
    expect(logs.byType('pdf-generator|request-blocked')).toHaveLength(0);
  });

  it('blocks hosts that are not allowlisted and sanitizes the logged url', async () => {
    expectPdf(await postPdf(app, { html: page('http://not-allowed.e2e.test/x.png?token=e2e-secret') }));
    expectBlocked('host-not-allowed');
    expect(logs.raw()).not.toContain('e2e-secret');
  });

  it.each(['http://10.0.0.1/', 'http://[::1]/', 'http://[fd00::1]/', 'http://[::ffff:127.0.0.1]/'])('blocks private literal %s', async (url) => {
    expectPdf(await postPdf(app, { html: page(url) }));
    expectBlocked('private-address');
  });

  it('blocks schemes other than http(s) and local ones', async () => {
    expectPdf(await postPdf(app, { html: page('ftp://assets.e2e.test/x') }));
    expectBlocked('scheme-not-allowed');
  });

  it('blocks a listed host when DNS fails', async () => {
    jest.spyOn(dns.promises, 'lookup').mockRejectedValue(new Error('ENOTFOUND'));
    expectPdf(await postPdf(app, { html: page('http://assets.e2e.test/x.png') }));
    expectBlocked('dns-failure');
  });

  it('blocks a listed host that resolves to a private address', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '192.168.1.5', family: 4 }] as never);
    expectPdf(await postPdf(app, { html: page('http://assets.e2e.test/x.png') }));
    expectBlocked('private-address');
  });

  it('loads an allowed remote resource through the pinned address', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '203.0.113.10', family: 4 }] as never);
    const scope = nock('http://assets.e2e.test').get('/logo.png').reply(200, PNG, { 'content-type': 'image/png', connection: 'close' });

    expectPdf(await postPdf(app, { html: page('http://assets.e2e.test/logo.png') }));
    expect(scope.isDone()).toBe(true);
    expect(logs.byType('pdf-generator|request-blocked')).toHaveLength(0);
  });

  it('logs request-error and still renders when the outbound request is refused', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '203.0.113.10', family: 4 }] as never);
    // No interceptor and net connect disabled: the outbound request fails.

    expectPdf(await postPdf(app, { html: page('http://assets.e2e.test/broken.png') }));
    expect(logs.byType('pdf-generator|request-error').length).toBeGreaterThan(0);
  });
});
