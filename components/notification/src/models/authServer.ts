import { getIdApiClient } from '@liquio/back-core';

// Constants.
const TOKEN_CACHE_TTL_MS = 1000 * 60 * 10;

export class Auth {
  cache: Record<string, { expiredAt: number; data: any } | undefined>;

  constructor() {
    this.cache = {}; // { "some-user-id": { "expiredAt": "...", "data": { ... } } }
  }

  async checkToken(token: string): Promise<any> {
    // Check cache.
    if (this.cache[token]) {
      if (this.cache[token]!.expiredAt < +new Date()) {
        this.cache[token] = undefined;
      } else {
        return this.cache[token]!.data;
      }
    }

    // Get user data.
    const user: any = await getIdApiClient().getUser(token);
    if ('userId' in user) {
      user._id = user.userId;
      this.cache[token] = {
        expiredAt: +new Date() + TOKEN_CACHE_TTL_MS,
        data: user,
      };
    }
    return user;
  }

  async getUsersInfo(array: unknown[]): Promise<any[]> {
    const users: any[] = await getIdApiClient().getUsersByIdsRaw(array as string[]);
    return this.prepareUsers(users);
  }

  async getUsersInfoByIpn(array: unknown[]): Promise<any[]> {
    const users: any[] = await getIdApiClient().getUsersByCodesRaw(array as string[]);
    return this.prepareUsers(users);
  }

  private prepareUsers(users: any[]): any[] {
    for (const user of users) {
      if ('userId' in user) user._id = user.userId;
      delete user.password;
    }
    return users;
  }
}
