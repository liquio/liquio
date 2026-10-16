const mockDestroy = jest.fn();

jest.mock('../sms_queue', () => ({
  SmsQueueModel: jest.fn().mockImplementation(() => ({ SmsQueue: { destroy: (...args: any[]) => mockDestroy(...args) } })),
}));
jest.mock('../../config/config', () => ({}));

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
