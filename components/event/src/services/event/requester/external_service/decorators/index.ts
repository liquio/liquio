import { DecoratorStandard } from './decorator_standard';
import { DecoratorStandardTrembita } from './decorator_standard_trembita';
import { DecoratorTrembita } from './decorator_trembita';
import { DecoratorTrembitaListMethods } from './decorator_trembita_list_methods';
import { DecoratorSigner } from './decorator_signer';

/**
 * Decorators.
 */
export class Decorators {
  byDocumentTemplate: Record<string, any>;

  /**
   * Decorators constructor.
   */
  constructor(config?: any) {
    // Start with predefined decorators
    this.byDocumentTemplate = {
      standard: {
        default: new DecoratorStandard(),
      },
      standardTrembita: {
        default: new DecoratorStandardTrembita(),
      },
      trembita: {
        default: new DecoratorTrembita(),
        listMethods: new DecoratorTrembitaListMethods(),
      },
      signer: new DecoratorSigner(),
    };

    // Add dynamic providers from config
    if (config) {
      Object.keys(config).forEach((key) => {
        if (!this.byDocumentTemplate[key]) {
          const providerConfig = config[key];
          const providerType = providerConfig.provider || 'standard';

          switch (providerType) {
            case 'trembita':
              this.byDocumentTemplate[key] = {
                default: new DecoratorTrembita(),
                listMethods: new DecoratorTrembitaListMethods(),
              };
              break;
            case 'standardTrembita':
              this.byDocumentTemplate[key] = {
                default: new DecoratorStandardTrembita(),
              };
              break;
            case 'signer':
              this.byDocumentTemplate[key] = new DecoratorSigner();
              break;
            case 'standard':
              this.byDocumentTemplate[key] = {
                default: new DecoratorStandard(),
              };
              break;
            default:
              throw new Error(`Unknown provider type: "${providerType}" for external service "${key}"`);
          }
        }
      });
    }
  }
}
