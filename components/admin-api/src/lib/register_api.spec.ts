import { getRegisterApiClient, resetRegisterApiClient, RegisterApiError } from '@liquio/back-core';

import { initRegisterApiClient, callRegisterLegacy } from './register_api';
import { setAppContext, resetAppContext } from './context';

describe('register_api', () => {
  let save: jest.Mock;

  beforeEach(() => {
    resetRegisterApiClient();
    save = jest.fn();
    setAppContext({ log: { save } });
  });

  afterEach(() => {
    resetRegisterApiClient();
    resetAppContext();
  });

  describe('initRegisterApiClient', () => {
    it('should map the register config and apply the default timeout', () => {
      const client = initRegisterApiClient({ server: 'http://register.local', port: 9000, token: 'secret' });

      expect(client.baseUrl).toBe('http://register.local:9000');
      expect(client.timeout).toBe(30000);
      expect((client as any).config).toMatchObject({ token: 'secret' });
      expect(getRegisterApiClient()).toBe(client);
    });

    it('should pass the configured timeout through', () => {
      expect(initRegisterApiClient({ server: 'http://register.local', port: 9000, timeout: 5000 }).timeout).toBe(5000);
    });

    it('should work without a config', () => {
      expect(initRegisterApiClient()).toBeDefined();
    });
  });

  describe('callRegisterLegacy', () => {
    const httpError = () => new RegisterApiError('Bad request', { code: 'HTTP_ERROR', status: 400, body: { error: 'x' } } as any);

    it('should return the value of a successful call', async () => {
      await expect(callRegisterLegacy('log-name', async () => ({ ok: true }), 'body')).resolves.toEqual({ ok: true });
      expect(save).not.toHaveBeenCalled();
    });

    it('should return the error body on an HTTP error in body mode', async () => {
      const result = await callRegisterLegacy('log-name', () => Promise.reject(httpError()), 'body');

      expect(result).toEqual({ error: 'x' });
      expect(save).toHaveBeenCalledWith('log-name', { status: 400, error: 'Bad request' }, 'warn');
    });

    it('should return undefined on an HTTP error in undefined mode', async () => {
      await expect(callRegisterLegacy('log-name', () => Promise.reject(httpError()), 'undefined')).resolves.toBeUndefined();
    });

    it.each(['NETWORK_ERROR', 'TIMEOUT'])('should rethrow a plain error for %s', async (code) => {
      const error = new RegisterApiError('failed', { code, cause: new Error('inner') } as any);

      const thrown = await callRegisterLegacy('log-name', () => Promise.reject(error), 'body').catch((e) => e);

      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toBeInstanceOf(RegisterApiError);
      expect(thrown.message).toBe('failed');
      expect(thrown.details).toBeUndefined();
      expect(thrown.status).toBeUndefined();
      expect(save).toHaveBeenCalledWith('log-name', { error: 'failed' });
    });
  });
});
