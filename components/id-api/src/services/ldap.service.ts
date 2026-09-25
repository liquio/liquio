import * as ldapts from 'ldapts';

import { Config } from '../config';
import { BaseService } from './base_service';

// Reference: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/useraccountcontrol-manipulate-account-properties
export const ACCOUNT_CONTROL_FLAGS = {
  SCRIPT: 1,
  ACCOUNTDISABLE: 2,
  HOMEDIR_REQUIRED: 8,
  LOCKOUT: 16,
  PASSWD_NOTREQD: 32,
  PASSWD_CANT_CHANGE: 64,
  ENCRYPTED_TEXT_PWD_ALLOWED: 128,
  TEMP_DUPLICATE_ACCOUNT: 256,
  NORMAL_ACCOUNT: 512,
  INTERDOMAIN_TRUST_ACCOUNT: 2048,
  WORKSTATION_TRUST_ACCOUNT: 4096,
  SERVER_TRUST_ACCOUNT: 8192,
  DONT_EXPIRE_PASSWORD: 65536,
  MNS_LOGON_ACCOUNT: 131072,
  SMARTCARD_REQUIRED: 262144,
  TRUSTED_FOR_DELEGATION: 524288,
  NOT_DELEGATED: 1048576,
  USE_DES_KEY_ONLY: 2097152,
  DONT_REQ_PREAUTH: 4194304,
  PASSWORD_EXPIRED: 8388608,
  TRUSTED_TO_AUTH_FOR_DELEGATION: 16777216,
  PARTIAL_SECRETS_ACCOUNT: 67108864,
};

export class LdapService extends BaseService {
  private readonly client!: ldapts.Client;
  private readonly cfg: Config['ldap'];

  constructor(...args: ConstructorParameters<typeof BaseService>) {
    super(...args);

    this.cfg = this.config.ldap;

    if (this.cfg?.isEnabled && this.cfg?.url) {
      this.client = new ldapts.Client({
        url: this.cfg.url,
      });
    }
  }

  get isEnabled() {
    return this.cfg?.isEnabled || false;
  }

  get isRequired() {
    return this.cfg?.isRequired || false;
  }

  async init() {
    if (this.isEnabled) {
      if (!this.cfg?.baseDN) {
        this.log.save('ldap-init-fail', { error: 'No baseDN provided' }, 'error');
      }
      await this.connect();
    }
  }

  async connect() {
    try {
      await this.client.bind(this.cfg!.username!, this.cfg!.password);
      this.log.save('ldap-connect-success');
    } catch (error: any) {
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

  /// Find the user by principal name (email)
  async findUserByPrincipal(principal: string) {
    this.log.save('ldap-find-user-by-principal', { principal });

    const client = await this.getClient();

    try {
      const { searchEntries } = await client.search(this.cfg?.baseDN!, {
        scope: 'sub',
        filter: `(&(objectClass=user)(userPrincipalName=${principal}))`,
      });

      if (searchEntries.length === 0) {
        this.log.save('ldap-find-user-by-principal-not-found', { principal }, 'error');
        return null;
      } else if (searchEntries.length > 1) {
        this.log.save('ldap-find-user-by-principal-many', { principal, count: searchEntries.length }, 'error');
        throw new Error('Many users found.');
      }

      const [user] = searchEntries;
      return user;
    } catch (error: any) {
      this.log.save('ldap-find-user-by-principal-fail', { principal, error: error.toString() }, 'error');
      throw error;
    }
  }

  /// Find the user by full name (ПІБ)
  async findUserByFullName(fullName: string) {
    this.log.save('ldap-find-by-full-name', { fullName });

    const client = await this.getClient();

    try {
      const { searchEntries } = await client.search(this.cfg?.baseDN!, {
        scope: 'sub',
        filter: `(&(objectClass=user)(description=${fullName}))`,
      });

      if (searchEntries.length === 0) {
        this.log.save('ldap-find-by-full-name-not-found', { fullName }, 'error');
        return null;
      } else if (searchEntries.length > 1) {
        this.log.save('ldap-find-by-full-name-many', { fullName, count: searchEntries.length }, 'error');
        throw new Error('Many users found.');
      }

      const [user] = searchEntries;
      return user;
    } catch (error: any) {
      this.log.save('ldap-find-by-full-name-fail', { fullName, error: error.toString() }, 'error');
      throw error;
    }
  }

  /// Find group by DN
  async findGroupByDN(dn: string) {
    this.log.save('ldap-find-group-by-dn', { dn });

    const client = await this.getClient();

    try {
      const { searchEntries } = await client.search(this.cfg?.baseDN!, {
        scope: 'sub',
        filter: `(&(objectClass=group)(distinguishedName=${dn}))`,
      });

      if (searchEntries.length === 0) {
        this.log.save('ldap-find-group-by-dn-not-found', { dn }, 'error');
        return null;
      } else if (searchEntries.length > 1) {
        this.log.save('ldap-find-group-by-dn-many', { dn, count: searchEntries.length }, 'error');
        throw new Error('Many groups found.');
      }

      const [group] = searchEntries;
      return group;
    } catch (error: any) {
      this.log.save('ldap-find-group-by-dn-fail', { dn, error: error.toString() }, 'error');
      throw error;
    }
  }

  /// Parse the integer userAccountControl field value into bitflags
  unpackUserAccountControl(code: number) {
    return Object.fromEntries(Object.entries(ACCOUNT_CONTROL_FLAGS).map(([name, flag]) => [name, Boolean(code & flag)]));
  }
}
