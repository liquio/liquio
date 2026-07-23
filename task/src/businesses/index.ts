
import { Business } from './business';
import { WorkflowBusiness } from './workflow';
import { WorkflowTemplateBusiness } from './workflow_template';
import { TaskBusiness } from './task';
import { DocumentBusiness } from './document';
import { RegisterBusiness } from './register';
import { UserInboxBusiness } from './user_inbox';
import { ExternalServicesBusiness } from './external_services';

// Constants.
const BUSINESSES_CLASSES_LIST = [
  Business,
  WorkflowBusiness,
  WorkflowTemplateBusiness,
  TaskBusiness,
  DocumentBusiness,
  RegisterBusiness,
  UserInboxBusiness,
  ExternalServicesBusiness
];

/**
 * Businesses.
 */
export class Businesses {
  private static singleton: Businesses;

  config: any;
  businesses: any;

  /**
   * Businesses constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
    // Define singleton.
    if (!Businesses.singleton) {
      this.config = config;
      this.initBusinesses();
      Businesses.singleton = this;
    }
    return Businesses.singleton;
  }

  /**
   * Classes list.
   */
  static get List() {
    return BUSINESSES_CLASSES_LIST;
  }

  /**
   * Init businesses.
   * @private
   */
  initBusinesses() {
    // Define businesses classses.
    const businessesByNames: Record<string, any> = {
      workflow: WorkflowBusiness,
      workflowTemplate: WorkflowTemplateBusiness,
      task: TaskBusiness,
      document: DocumentBusiness,
      register: RegisterBusiness,
      userInbox: UserInboxBusiness,
      externalServices: ExternalServicesBusiness,
    };

    // Init controllers.
    this.businesses = Object.entries(businessesByNames)
      .map(v => [v[0], new v[1](this.config)])
      .reduce(
        (t, v) => ({
          ...t,
          ...(() => {
            const n: Record<string, any> = {};
            n[v[0] as string] = v[1];
            return n;
          })()
        }),
        {}
      );

    global.businesses = this.businesses;
  }
}

