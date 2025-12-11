const axios = require('axios');
let { conf } = global;

const Auth = class {
  constructor() {
    if (conf.auth_server.host == 'https://id.test.liquio.local') {
      conf.auth_server.user = 999;
      conf.auth_server.password = 999;
    }
    this.pass = Buffer(`${conf.auth_server.user}:${conf.auth_server.password}`).toString('base64');
    // this.getUsersInfo(["588b54786c7749c1b73fa08d","588b67106c7749c1b73fa0a7"]).then((e)=>{console.log(e);})
    this.cache = {}; // { "some-user-id": { "expiredAt": "...", "data": { ... } } }
  }

  async checkToken(token) {
    try {
      // Check cache.
      if (this.cache[token]) {
        if (this.cache[token].expiredAt < +new Date()) {
          this.cache[token] = undefined;
        } else {
          return this.cache[token].data;
        }
      }

      // Get user data.
      let user = await axios(`${conf.auth_server.host}/user/info?access_token=${token}`).then((res) => res.data);
      if ('userId' in user) {
        user._id = user.userId;
        this.cache[token] = {
          expiredAt: +new Date() + 1000 * 60 * 10,
          data: user,
        };
      }
      return user;
    } catch (e) {
      throw e;
    }
  }

  async getUsersInfo(array) {
    try {
      let users = await axios(`${conf.auth_server.host}/user/info/id`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.pass}`,
        },
        data: {
          id: array,
        },
      }).then((res) => res.data);
      for (let user of users) {
        if ('userId' in user) user._id = user.userId;
        delete user.password;
      }
      return users;
    } catch (e) {
      throw e;
    }
  }

  async getUsersInfoByIpn(array) {
    try {
      let users = await axios(`${conf.auth_server.host}/user/info/ipn`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.pass}`,
        },
        data: {
          ipn: array,
        },
      }).then((res) => res.data);
      for (let user of users) {
        if ('userId' in user) user._id = user.userId;
        delete user.password;
      }
      return users;
    } catch (e) {
      throw e;
    }
  }

  async getUserInfoByPhone(phone) {
    return await axios({
      url: `${conf.auth_server.host}/user/info/phone?phone=${phone}`,
      method: 'GET',
      headers: {
        Authorization: `Basic ${this.pass}`,
      },
    }).then((res) => res.data);
  }

  async getAllUsers(startFrom = 0, limit = 20) {
    try {
      let users = await axios(`${conf.auth_server.host}/user?offset=${startFrom}&limit=${limit}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${this.pass}`,
        },
      }).then((res) => res.data);
      return users;
    } catch (e) {
      throw e;
    }
  }
};

module.exports = Auth;
