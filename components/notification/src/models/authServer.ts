import axios from 'axios';

const { conf } = global as any;

export class Auth {
  basicAuthToken: string;
  cache: Record<string, { expiredAt: number; data: any } | undefined>;

  constructor() {
    this.basicAuthToken = conf.auth_server.basicAuthToken || Buffer.from(`${conf.auth_server.user}:${conf.auth_server.password}`).toString('base64');
    this.cache = {}; // { "some-user-id": { "expiredAt": "...", "data": { ... } } }
  }

  get authorizationHeader(): string {
    return this.basicAuthToken.startsWith('Basic ') ? this.basicAuthToken : `Basic ${this.basicAuthToken}`;
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
    const user = await axios(`${conf.auth_server.host}/user/info?access_token=${token}`).then((res) => res.data);
    if ('userId' in user) {
      user._id = user.userId;
      this.cache[token] = {
        expiredAt: +new Date() + 1000 * 60 * 10,
        data: user,
      };
    }
    return user;
  }

  async getUsersInfo(array: unknown[]): Promise<any[]> {
    const users = await axios(`${conf.auth_server.host}/user/info/id`, {
      method: 'POST',
      headers: {
        Authorization: this.authorizationHeader,
      },
      data: {
        id: array,
      },
    }).then((res) => res.data);
    for (const user of users) {
      if ('userId' in user) user._id = user.userId;
      delete user.password;
    }
    return users;
  }

  async getUsersInfoByIpn(array: unknown[]): Promise<any[]> {
    const users = await axios(`${conf.auth_server.host}/user/info/ipn`, {
      method: 'POST',
      headers: {
        Authorization: this.authorizationHeader,
      },
      data: {
        ipn: array,
      },
    }).then((res) => res.data);
    for (const user of users) {
      if ('userId' in user) user._id = user.userId;
      delete user.password;
    }
    return users;
  }

  async getUserInfoByPhone(phone: string): Promise<any> {
    return await axios({
      url: `${conf.auth_server.host}/user/info/phone?phone=${phone}`,
      method: 'GET',
      headers: {
        Authorization: this.authorizationHeader,
      },
    }).then((res) => res.data);
  }

  async getAllUsers(startFrom = 0, limit = 20): Promise<any[]> {
    const users = await axios(`${conf.auth_server.host}/user?offset=${startFrom}&limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: this.authorizationHeader,
      },
    }).then((res) => res.data);
    return users;
  }
}
