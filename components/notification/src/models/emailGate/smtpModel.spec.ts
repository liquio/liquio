const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: (...a: any[]) => mockSendMail(...a) }) }));

const save = jest.fn();

import { setAppContext } from '../../lib/context';
import { SmtpModel } from './smtpModel';

setAppContext({ conf: { smtpServer: {} }, log: { save } });

describe('SmtpModel logging (NT-10)', () => {
  const body = { email: 'john.doe+x@example.com', subject: 'Top secret subject', text: '<p>SECRET-BODY</p>', doNotEscapeEmail: true };

  beforeEach(() => save.mockReset());

  it('does not log body, address or subject on success', async () => {
    mockSendMail.mockResolvedValue({ messageId: 'id-1', accepted: ['john.doe+x@example.com'], rejected: [], response: '250 OK' });
    await new SmtpModel().sendOneMail(body);
    const dump = JSON.stringify(save.mock.calls);
    expect(dump).not.toContain('SECRET-BODY');
    expect(dump).not.toContain('john.doe');
    expect(dump).not.toContain('Top secret');
    expect(dump).toContain('id-1');
  });

  it('does not log body or address on error', async () => {
    mockSendMail.mockRejectedValue(new Error('boom'));
    await expect(new SmtpModel().sendOneMail(body)).rejects.toThrow('boom');
    const dump = JSON.stringify(save.mock.calls);
    expect(dump).not.toContain('SECRET-BODY');
    expect(dump).not.toContain('john.doe');
    expect(dump).toContain('boom');
  });
});
