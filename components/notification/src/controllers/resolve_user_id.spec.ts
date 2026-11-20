import { resolveUserId } from './resolve_user_id';

describe('resolveUserId', () => {
  it('returns the token owner and ignores a conflicting user_id', async () => {
    const checkToken = jest.fn().mockResolvedValue({ _id: 'token-user' });

    await expect(resolveUserId({ access_token: 'tok', user_id: 'victim' }, checkToken)).resolves.toBe('token-user');
    expect(checkToken).toHaveBeenCalledWith('tok');
  });

  it('uses user_id when no access token is given', async () => {
    const checkToken = jest.fn();

    await expect(resolveUserId({ user_id: '42' }, checkToken)).resolves.toBe('42');
    expect(checkToken).not.toHaveBeenCalled();
  });

  it('rejects with 401 and does not fall back to user_id when the token is invalid', async () => {
    const checkToken = jest.fn().mockResolvedValue({ error: 'bad token' });

    await expect(resolveUserId({ access_token: 'bad', user_id: 'victim' }, checkToken)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects with 400 when no identity is given', async () => {
    const checkToken = jest.fn();

    await expect(resolveUserId({}, checkToken)).rejects.toMatchObject({ statusCode: 400, error: { message: expect.any(String) } });
    await expect(resolveUserId({ user_id: '' }, checkToken)).rejects.toMatchObject({ statusCode: 400 });
    await expect(resolveUserId(undefined, checkToken)).rejects.toMatchObject({ statusCode: 400 });
  });
});
