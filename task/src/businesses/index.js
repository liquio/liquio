
const Business = require('./business');
const WorkflowBusiness = require('./workflow');
const WorkflowTemplateBusiness = require('./workflow_template');
const TaskBusiness = require('./task');
const DocumentBusiness = require('./document');
const RegisterBusiness = require('./register');
const UserInboxBusiness = require('./user_inbox');
const ExternalServicesBusiness = require('./external_services');

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
class Businesses {
  /**
   * Businesses constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
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
   * @param {object} [customBusinesses] Custom businesses as { someBusinessName: SomeBusinessClass, anotherBusinessName: AnotherBusinessClass }.
   * @private
   */
  initBusinesses() {
    // Define businesses classses.
    const businessesByNames = {
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
            let n = {};
            n[v[0]] = v[1];
            return n;
          })()
        }),
        {}
      );

    global.businesses = this.businesses;
  }
}

module.exports = Businesses;
