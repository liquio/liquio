import { MessageBusConfigError, MessageBusError, MessageBusPublishError, MessageBusUnavailableError, MessageTooLargeError } from './errors';

describe('message bus errors', () => {
  it('have fixed names and codes', () => {
    const cause = new Error('x');
    const cases: Array<[MessageBusError, string, string]> = [
      [new MessageBusConfigError('a'), 'MessageBusConfigError', 'MESSAGE_BUS_CONFIG'],
      [new MessageBusUnavailableError(), 'MessageBusUnavailableError', 'MESSAGE_BUS_UNAVAILABLE'],
      [new MessageTooLargeError(10, 5), 'MessageTooLargeError', 'MESSAGE_TOO_LARGE'],
      [new MessageBusPublishError('p', cause), 'MessageBusPublishError', 'MESSAGE_BUS_PUBLISH'],
    ];
    for (const [error, name, code] of cases) {
      expect(error).toBeInstanceOf(MessageBusError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(name);
      expect(error.code).toBe(code);
    }
  });

  it('carries sizes and cause', () => {
    const error = new MessageTooLargeError(10, 5);
    expect([error.sizeBytes, error.limitBytes]).toEqual([10, 5]);
    const cause = new Error('x');
    expect(new MessageBusPublishError('p', cause).cause).toBe(cause);
  });
});
