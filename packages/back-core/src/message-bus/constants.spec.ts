import { MESSAGE_BUS_RETRY_DELAYS, MESSAGE_ID_FIELD, extractMessageId, getRetryDelayMs } from './constants';

describe('message bus constants', () => {
  it('getRetryDelayMs', () => {
    expect(getRetryDelayMs('10m')).toBe(600000);
    expect(getRetryDelayMs('1h')).toBe(3600000);
    expect(getRetryDelayMs('2h')).toBe(7200000);
    expect(getRetryDelayMs('8h')).toBe(28800000);
    expect(getRetryDelayMs('1d')).toBe(86400000);
    expect(getRetryDelayMs('x')).toBe(MESSAGE_BUS_RETRY_DELAYS['errors-1d']);
    expect(getRetryDelayMs(undefined)).toBe(MESSAGE_BUS_RETRY_DELAYS['errors-1d']);
  });

  it('extractMessageId', () => {
    const body = (value: unknown) => Buffer.from(JSON.stringify(value));
    expect(extractMessageId(body({ [MESSAGE_ID_FIELD]: 'abc' }))).toBe('abc');
    expect(extractMessageId(body({}))).toBeUndefined();
    expect(extractMessageId(body({ [MESSAGE_ID_FIELD]: '' }))).toBeUndefined();
    expect(extractMessageId(body({ [MESSAGE_ID_FIELD]: 5 }))).toBeUndefined();
    expect(extractMessageId(body(null))).toBeUndefined();
    expect(extractMessageId(Buffer.from('not json'))).toBeUndefined();
  });
});
