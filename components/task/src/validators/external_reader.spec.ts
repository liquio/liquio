import { ExternalReaderValidator } from './external_reader';

const run = async (params: Record<string, any>) => {
  const validator: any = new ExternalReaderValidator({}).getCaptchaChallenge();
  const req: any = { params, body: {}, query: {}, headers: {} };
  for (const chain of validator) {
    await chain.run(req);
  }
  const { validationResult } = require('express-validator');
  return validationResult(req).isEmpty();
};

describe('ExternalReaderValidator.getCaptchaChallenge', () => {
  it('accepts valid service and method', async () => {
    expect(await run({ service: 'recaptcha', method: 'get' })).toBe(true);
    expect(await run({ service: 'my_service-1', method: 'A-b_9' })).toBe(true);
  });

  it.each([
    ['..', 'x'],
    ['a/b', 'x'],
    ['%2e%2e', 'x'],
    ['../admin', 'x'],
    ['svc', 'a?b'],
    ['svc', 'a#b'],
    ['svc', 'a\\b'],
    ['', 'x'],
    ['svc', ''],
    ['a'.repeat(200), 'x'],
    ['svc', 'a'.repeat(129)],
  ])('rejects service=%p method=%p', async (service, method) => {
    expect(await run({ service, method })).toBe(false);
  });

  it('rejects non-string values', async () => {
    expect(await run({ service: ['a'], method: 'x' })).toBe(false);
    expect(await run({ method: 'x' })).toBe(false);
  });
});
