import { Log } from '../lib/log';
import { Models } from '../models';
import { Express } from '../types';
import { AppInfoService } from './app_info.service';
import { AuthService } from './auth.service';
import { EdsService } from './eds.service';
import { LdapService } from './ldap.service';
import { NotifyService } from './notify.service';
import { PasswordManagerService } from './password_manager.service';
import { PingRequestService } from './ping_request.service';
import { RedisService } from './redis.service';
import { SchedulerService } from './scheduler.service';
import { UserService } from './user.service';
import { ConfirmCodeCleanupService } from './confirm_сode_сleanup.service';
import { X509Service } from './x509.service';

export interface ServicesCollection {
  appInfo: AppInfoService;
  eds: EdsService;
  ldap: LdapService;
  auth: AuthService;
  passwordManager: PasswordManagerService;
  pingRequest: PingRequestService;
  redis: RedisService;
  scheduler: SchedulerService;
  notify: NotifyService;
  user: UserService;
  confirmCodeCleanup: ConfirmCodeCleanupService;
  x509: X509Service;
}

export class Services {
  private readonly log = Log.get();
  private static singleton: Services;
  private readonly services!: ServicesCollection;

  constructor(config: any, models: Models, express: Express) {
    if (Services.singleton) {
      throw new Error('Services already initialized.');
    }

    try {
      this.services = {
        appInfo: new AppInfoService(config, models, express),
        eds: new EdsService(config, models, express),
        ldap: new LdapService(config, models, express),
        auth: new AuthService(config, models, express),
        passwordManager: new PasswordManagerService(config, models, express),
        pingRequest: new PingRequestService(config, models, express),
        redis: new RedisService(config, models, express),
        scheduler: new SchedulerService(config, models, express),
        notify: new NotifyService(config, models, express),
        user: new UserService(config, models, express),
        confirmCodeCleanup: new ConfirmCodeCleanupService(config, models, express),
        x509: new X509Service(config, models, express),
      };
    } catch (error: any) {
      this.log.save('services-init-error', { error: error.message, stack: error.stack }, 'error');
      process.exit(1);
    }

    Services.singleton = this;
  }

  static get isInitialized() {
    return Services.singleton !== undefined;
  }

  static service<K extends keyof ServicesCollection>(service: K): ServicesCollection[K] {
    if (!Services.singleton) {
      throw new Error(`Services are not initialized`);
    }
    if (!Services.singleton.services[service]) {
      throw new Error(`Service ${service} not found`);
    }
    return Services.singleton.services[service];
  }

  async init() {
    for (const [name, service] of Object.entries(this.services) as [keyof ServicesCollection, ServicesCollection[keyof ServicesCollection]][]) {
      try {
        await service.init();
      } catch (error: any) {
        this.log.save('services-init-error', { service: name, error: error.message, stack: error.stack }, 'error');
        throw new Error(`Service ${name} initialization error: ${error.message}`);
      }
    }
  }

  async stop() {
    for (const [name, service] of Object.entries(this.services) as [keyof ServicesCollection, ServicesCollection[keyof ServicesCollection]][]) {
      try {
        await service.stop();
      } catch (error: any) {
        this.log.save('services-stop-error', { service: name, error: error.message, stack: error.stack }, 'error');
        throw new Error(`Service ${name} stop error: ${error.message}`);
      }
    }
  }
}
