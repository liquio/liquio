import { Injectable, OnModuleInit } from '@nestjs/common';

import { PluginLoader, PluginLogger, PluginRegistry } from '@liquio/plugin-sdk';

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
  private pluginRegistry?: PluginRegistry;

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

  async onModuleInit() {
    const pluginsConfig = this.config.get('plugins');
    if (pluginsConfig) {
      // Adapt the injected NestJS `LoggerService` to the minimal `PluginLogger` contract
      const logger = this.logger;
      const pluginLog: PluginLogger = {
        save: (type: string, data?: unknown, level?: string) => {
          if (level === 'error') return logger.error(type, data);
          if (level === 'warning') return logger.warn(type, data);
          return logger.log(type, data);
        },
      };
      this.pluginRegistry = await new PluginLoader(pluginLog).load(pluginsConfig);
    }
    this.loadServices();
  }

  /**
   * Load and initialize all configured provider services.
   */
  private loadServices() {
    for (const [name, serviceConfig] of Object.entries(this.cfg)) {
      if (serviceConfig.isEnabled) {
        try {
          const BuiltIn = this.providers[serviceConfig.class];
          const provider = BuiltIn
            ? new BuiltIn(this.logger, serviceConfig.options)
            : (this.pluginRegistry?.get(serviceConfig.class) as unknown as BaseProvider<unknown> | undefined);

          if (!provider) {
            this.logger.error('provider-service|class-not-found', {
              name,
              class: serviceConfig.class,
            });
            continue;
          }

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
