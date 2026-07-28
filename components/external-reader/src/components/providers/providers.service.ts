import { Injectable, OnModuleInit } from '@nestjs/common';

import { ConfigurationService } from '@components/configuration/configuration.service';
import { Configuration } from '@components/configuration/configuration.types';
import { LoggerService } from '@components/observability/logger.service';

import { BaseProvider, ProviderMethod } from './base.provider';
import { HttpProvider } from './http.provider';

@Injectable()
export class ProvidersService implements OnModuleInit {
  private readonly cfg: Configuration['services'];
  private services = new Map<string, BaseProvider<unknown>>();
  private providers: { [key: string]: typeof BaseProvider<unknown> };

  constructor(
    private readonly config: ConfigurationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ProvidersService.name);
    this.cfg = this.config.get('services') || {};
    this.providers = {
      HttpProvider,
    };
  }

  onModuleInit() {
    this.loadServices();
  }

  /**
   * Load and initialize all configured provider services.
   */
  private loadServices() {
    for (const [name, serviceConfig] of Object.entries(this.cfg)) {
      if (serviceConfig.isEnabled) {
        try {
          const classRef = this.providers[serviceConfig.class];
          if (!classRef) {
            this.logger.error('provider-service|class-not-found', {
              name,
              class: serviceConfig.class,
            });
            continue;
          }

          const provider = new classRef(this.logger, serviceConfig.options);
          this.services.set(name, provider);
          this.logger.log('provider-service|loaded', { name });
        } catch (error) {
          this.logger.error('provider-service|load-failed', { name, error: error.message });
        }
      } else {
        this.logger.warn('provider-service|disabled', { name });
      }
    }
  }

  /**
   * Get a method handler for a specific service and method.
   * @param serviceName Service name
   * @param methodName Method name
   * @returns Method handler or undefined
   */
  getMethod(serviceName: string, methodName: string): ProviderMethod | undefined {
    const service = this.services.get(serviceName);
    const method = service?.getMethod(methodName);

    if (!method) {
      this.logger.warn('provider-service|method-not-found', {
        service: serviceName,
        method: methodName,
      });
      return undefined;
    }

    return method;
  }
}
