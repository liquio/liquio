const ldapts = require('ldapts');

class LdapClient {
  static instance = null;

  static config = {
    isEnabled: false,
    isRequired: false,
    url: 'ldap://domain.loc',
    baseDN: 'dc=DOMAIN,dc=LOC',
    username: 'admin@domain.loc',
    password: '<removed>'
  };

  static async initialize(config) {
    if (!this.instance) {
      LdapClient.config = { ...LdapClient.config, ...config };
      this.instance = new LdapClient(config);
      await this.instance.connect();
    }

    return this.instance;
  }

  static getInstance() {
    return this.instance;
  }

  static get isEnabled() {
    return LdapClient.config.isEnabled;
  }

  static get isRequired() {
    return LdapClient.config.isRequired;
  }

  constructor(config) {
    this.log = global.log;
    this.log.save('ldap-client-init');
    this.config = config;
    this.client = new ldapts.Client({
      url: config.url,
    });
  }

  async connect() {
    try {
      await this.client.bind(this.config.username, this.config.password);
      this.log.save('ldap-connect-success');
    } catch (error) {
      this.log.save('ldap-connect-fail', { error: error.toString() }, 'error');
      throw error;
    }
  }

  async getClient() {
    if (this.client?.isConnected) {
      return this.client;
    }
    await this.connect();
    return this.client;
  }

  async findObjectByDn(objectClass, dn, scope = 'sub') {
    this.log.save('ldap-find-object-by-dn', { objectClass, dn });

    try {
      const client = await this.getClient();

      const { searchEntries } = await client.search(this.config.baseDN, {
        scope,
        filter: `(&(objectClass=${objectClass})(distinguishedName=${dn}))`,
        sizeLimit: 1,
      });

      if (!searchEntries || searchEntries.length === 0) {
        this.log.save('ldap-find-object-by-dn|not-found', { objectClass, dn }, 'error');
        return null;
      }

      const [object] = searchEntries;
      return object;
    } catch (error) {
      this.log.save('ldap-find-object-by-dn|fail', { objectClass, dn, error: error.toString() }, 'error');
      throw error;
    }
  }
}

module.exports = LdapClient;
