import { HttpRequest } from '../../../lib/http_request';
import { LiquioIdProvider } from './liquio_id';

jest.mock('@liquio/back-core', () => ({ getTraceId: () => 'trace-1' }));

describe('LiquioIdProvider.ldapGroupsExist', () => {
  const GROUP = 'CN=LIQUIO-PROD-UNIT-X,OU=Groups,DC=DOMAIN,DC=LOC';
  let send: jest.SpyInstance;
  let provider: LiquioIdProvider;

  beforeEach(() => {
    send = jest.spyOn(HttpRequest, 'send');
    provider = new LiquioIdProvider({
      server: 'http://id-api',
      port: 8100,
      basicAuthToken: 'c2VjcmV0',
      timeout: 1234,
    });
  });

  afterEach(() => {
    send.mockRestore();
  });

  it('posts the DNs with Basic auth to the id-api endpoint', async () => {
    send.mockResolvedValue({ existing: [GROUP] });

    await provider.ldapGroupsExist([GROUP, 'CN=Gone,DC=DOMAIN,DC=LOC']);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      url: 'http://id-api:8100/ldap/groups/exists',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': 'trace-1',
        Authorization: 'Basic c2VjcmV0',
      },
      body: JSON.stringify({ dns: [GROUP, 'CN=Gone,DC=DOMAIN,DC=LOC'] }),
      timeout: 1234,
    });
  });

  it('returns the existing DNs', async () => {
    send.mockResolvedValue({ existing: [GROUP] });

    await expect(provider.ldapGroupsExist([GROUP, 'CN=Gone,DC=DOMAIN,DC=LOC'])).resolves.toEqual([GROUP]);
  });

  it('returns an empty list when no group exists', async () => {
    send.mockResolvedValue({ existing: [] });

    await expect(provider.ldapGroupsExist([GROUP])).resolves.toEqual([]);
  });

  it('throws on a response without the existing list', async () => {
    send.mockResolvedValue({ existing: 'nope' });

    await expect(provider.ldapGroupsExist([GROUP])).rejects.toThrow('Wrong response format.');
  });

  it('throws on an empty response', async () => {
    send.mockResolvedValue(undefined);

    await expect(provider.ldapGroupsExist([GROUP])).rejects.toThrow('Wrong response format.');
  });

  it('passes a failed request on to the caller', async () => {
    send.mockRejectedValue(new Error('Request failed with status code 503'));

    await expect(provider.ldapGroupsExist([GROUP])).rejects.toThrow('503');
  });
});
