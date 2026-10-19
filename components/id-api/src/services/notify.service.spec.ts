const mockSave = jest.fn();
jest.mock('@liquio/back-core', () => ({ Log: { getInstance: () => ({ save: mockSave }) } }));
jest.mock('axios');
jest.mock('.', () => ({ Services: { service: jest.fn() } }));
jest.mock('../models', () => ({ Models: {} }));

import axios from 'axios';

import { NotifyService } from './notify.service';

const CODE = 'own-test-code-424242';
const FULL_MESSAGE = `Your confirmation code is ${CODE}`;

function loggedText(): string {
  return JSON.stringify(mockSave.mock.calls);
}

describe('NotifyService logging', () => {
  let service: NotifyService;

  beforeEach(() => {
    mockSave.mockClear();
    service = new NotifyService({ notify: { url: 'http://notify', authorization: 'own-test-auth' } } as any, {} as any, {} as any);
  });

  it('does not log the email body or confirmation code on success', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: [] });
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: {} });

    await service.sendMail('user@example.com', FULL_MESSAGE, 'Registration Confirmation');

    const text = loggedText();
    expect(text).toContain('user@example.com');
    expect(text).toContain('email-send-success');
    expect(text).not.toContain(CODE);
    expect(text).not.toContain('own-test-auth');
  });

  it('does not log request config or credentials when the mail request fails', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: [] });
    const error: any = new Error('Request failed');
    error.config = { data: JSON.stringify({ full_message: FULL_MESSAGE }), headers: { Authorization: 'own-test-auth' } };
    error.response = { status: 500 };
    (axios.post as jest.Mock).mockRejectedValueOnce(error);

    await expect(service.sendMail('user@example.com', FULL_MESSAGE, 'Registration Confirmation')).rejects.toThrow();

    const text = loggedText();
    expect(text).toContain('email-send-error');
    expect(text).not.toContain(CODE);
    expect(text).not.toContain('own-test-auth');
  });

  it('does not log the SMS request config when sending fails', async () => {
    const error: any = new Error('Request failed');
    error.config = { data: JSON.stringify({ short_message: FULL_MESSAGE }), headers: { Authorization: 'own-test-auth' } };
    (axios.post as jest.Mock).mockRejectedValueOnce(error);

    await expect(service.sendSms('+380000000000', FULL_MESSAGE)).rejects.toThrow();

    expect(loggedText()).not.toContain(CODE);
    expect(loggedText()).not.toContain('own-test-auth');
  });
});
