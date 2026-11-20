import axios from 'axios';

import { fetchOAuth2Profile } from './passport';

jest.mock('axios');

describe('fetchOAuth2Profile', () => {
  const get = axios.get as jest.Mock;
  const url = 'https://idp.example/profile';

  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ status: 200, data: {} });
  });

  it('sends the token in the Authorization header and not in the URL by default', async () => {
    await fetchOAuth2Profile({ userProfileUrl: url }, 'tok123');
    expect(get).toHaveBeenCalledWith(url, { headers: { Authorization: 'Bearer tok123' } });
    expect(get.mock.calls[0][0]).not.toContain('access_token');
    expect(get.mock.calls[0][0]).not.toContain('tok123');
  });

  it('uses the query only when tokenInQuery is enabled, and warns', async () => {
    const log = { save: jest.fn() } as any;
    await fetchOAuth2Profile({ userProfileUrl: url, tokenInQuery: true }, 'tok123', log);
    expect(get).toHaveBeenCalledWith(url, { params: { access_token: 'tok123' } });
    expect(log.save).toHaveBeenCalledWith('user-auth-by-oauth2-token-in-query', expect.any(Object), 'warn');
    expect(JSON.stringify(log.save.mock.calls)).not.toContain('tok123');
  });
});
