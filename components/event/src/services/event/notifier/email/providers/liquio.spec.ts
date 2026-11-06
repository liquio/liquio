import nock from 'nock';

import { LiquioProvider } from './liquio';
import { setAppContext, resetAppContext } from '../../../../../lib/context';

jest.mock('@liquio/back-core', () => ({
  getTraceId: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  Sandbox: { getInstance: jest.fn(() => ({})) },
}));

const SERVER = 'http://notify.test';
const PORT = 80;
const HTML = '<p>SECRET-HTML-BODY</p>';
const SUBJECT = 'SECRET-SUBJECT';
const EMAIL = 'person@secret-domain.test';
const ATTACHMENT_CONTENT = 'SECRET-ATTACHMENT-CONTENT';

describe('Email LiquioProvider logging', () => {
  let provider: LiquioProvider;
  let saved: any[];

  beforeAll(() => {
    provider = new LiquioProvider({
      server: SERVER,
      port: PORT,
      routes: { sendEmail: '/send', sendToUser: '/user' },
      timeout: 1000,
      user: 'u',
      password: 'p',
    });
  });

  beforeEach(() => {
    saved = [];
    setAppContext({ log: { save: jest.fn((type, data) => saved.push({ type, data })) } });
  });

  afterEach(() => {
    nock.cleanAll();
    resetAppContext();
  });

  const attachments = [{ name: 'secret-name.pdf', contentType: 'application/pdf', content: ATTACHMENT_CONTENT }];

  const expectNoLeak = () => {
    const logged = JSON.stringify(saved);
    for (const secret of [HTML, SUBJECT, EMAIL, ATTACHMENT_CONTENT, 'secret-name.pdf', 'SECRET-HTML-BODY']) {
      expect(logged).not.toContain(secret);
    }
  };

  it('does not log html, subject, addresses or attachments when sending to emails', async () => {
    nock(SERVER).post('/send').reply(200, { ok: true });
    await provider.sendViaEmails([EMAIL], SUBJECT, HTML, 1, false, undefined, undefined, undefined, attachments);
    expectNoLeak();
    const request = saved.find((s) => s.type === 'email-sending-request');
    expect(request.data).toEqual({
      url: `${SERVER}:${PORT}/send`,
      recipientsCount: 1,
      subjectLength: SUBJECT.length,
      hasHtml: true,
      attachmentsCount: 1,
    });
  });

  it('does not log content when sending to user ids', async () => {
    nock(SERVER).post('/user').reply(200, { ok: true });
    await provider.sendViaUserIds(['id-1', 'id-2'], SUBJECT, HTML, 1, false, undefined, undefined, undefined, attachments);
    expectNoLeak();
    expect(saved.find((s) => s.type === 'email-sending-request').data.recipientsCount).toBe(2);
  });

  it('does not log content when sending to user ipns', async () => {
    nock(SERVER).post('/user').reply(200, { ok: true });
    await provider.sendViaUsersIpn(['1234567890'], SUBJECT, HTML, 1, false, undefined, undefined, undefined, attachments);
    expectNoLeak();
    expect(JSON.stringify(saved)).not.toContain('1234567890');
  });

  it('prepareToLog tolerates missing body fields', () => {
    expect(provider.prepareToLog({ url: 'u', body: {} })).toEqual({
      url: 'u',
      recipientsCount: 0,
      subjectLength: 0,
      hasHtml: false,
      attachmentsCount: 0,
    });
  });
});
