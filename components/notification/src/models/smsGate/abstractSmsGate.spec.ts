const mockDestroy = jest.fn();

jest.mock('../sms_queue', () => ({
  SmsQueueModel: jest.fn().mockImplementation(() => ({ SmsQueue: { destroy: (...args: any[]) => mockDestroy(...args) } })),
}));
jest.mock('../../config/config', () => ({}));
jest.mock('axios', () => jest.fn());

import axios from 'axios';

import { AbstractGate } from './abstractSmsGate';

describe('AbstractGate queue removal (NT-06)', () => {
  let gate: AbstractGate;

  beforeEach(() => {
    mockDestroy.mockReset().mockResolvedValue(1);
    gate = new AbstractGate();
    jest.spyOn(gate, 'getSMSQueueCounter').mockResolvedValue({ smsQueueCount: 0 });
    jest.spyOn(gate, 'getSMSQueue').mockResolvedValue([]);
  });

  it.each([undefined, 0, '', null as any])('removeFromQueue(%p) throws and never truncates', async (id) => {
    await expect(gate.removeFromQueue(id)).rejects.toThrow('sms_id is required');
    await expect(gate.retrySendInQueue(id)).rejects.toThrow('sms_id is required');
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('removeFromQueue(id) deletes only that row', async () => {
    await gate.removeFromQueue(5);
    expect(mockDestroy).toHaveBeenCalledWith({ where: { sms_id: 5 } });
  });

  it('removeAllFromQueue truncates explicitly', async () => {
    await gate.removeAllFromQueue();
    expect(mockDestroy).toHaveBeenCalledWith({ truncate: true });
  });
});

describe('AbstractGate logging (NT-10)', () => {
  it('disabled gate logs masked phones and no text', async () => {
    const save = jest.fn();
    (global as any).log = { save };
    const gate = new AbstractGate();
    jest.spyOn(gate, 'isEnabled', 'get').mockReturnValue(false);
    await gate.sendSms(['380501234567'], 'SECRET-OTP');
    await gate.sendOneSms('380501234567', 'SECRET-OTP');
    const dump = JSON.stringify(save.mock.calls);
    expect(save).toHaveBeenCalledTimes(2);
    expect(dump).not.toContain('SECRET-OTP');
    expect(dump).not.toContain('380501234567');
  });
});

describe('AbstractGate error logging (NT-10b)', () => {
  it('logs a redacted summary, not the whole axios error', async () => {
    const axiosError: any = Object.assign(new Error('Request failed with status code 502'), {
      code: 'ERR_BAD_GATEWAY',
      response: { status: 502 },
      config: {
        method: 'post',
        url: 'https://sms.example.com/Subscribe/SendSmsQ.php?key=SECRET-KEY',
        headers: { Authorization: 'Bearer SECRET-TOKEN' },
        form: { tel: '380501234567', text: 'SECRET-OTP' },
      },
    });
    const gate = new AbstractGate();
    gate.options = {};
    jest.spyOn(gate, 'isEnabled', 'get').mockReturnValue(true);
    (global as any).crypto = require('node:crypto');
    (axios as unknown as jest.Mock).mockRejectedValue(axiosError);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(gate.sendOneSms('380501234567', 'SECRET-OTP')).rejects.toBe(axiosError);
    await expect(gate.sendSms(['380501234567'], 'SECRET-OTP')).rejects.toBe(axiosError);

    const dump = JSON.stringify(errorSpy.mock.calls);
    errorSpy.mockRestore();
    expect(dump).toContain('502');
    expect(dump).toContain('https://sms.example.com/Subscribe/SendSmsQ.php');
    for (const secret of ['SECRET', '380501234567', 'Bearer']) expect(dump).not.toContain(secret);
  });
});
