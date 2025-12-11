
const Controller = require('./controller');
const PingController = require('./ping');
const ModuleController = require('./module');
const MonitorController = require('./monitor');
const AuthController = require('./auth');
const RedirectController = require('./redirect');
const WorkflowController = require('./workflow');
const TaskController = require('./task');
const DocumentController = require('./document');
const WorkflowLogController = require('./workflow_log');
const WorkflowTemplateCategoryController = require('./workflow_template_category');
const WorkflowTemplateController = require('./workflow_template');
const TaskTemplateController = require('./task_template');
const DocumentTemplateController = require('./document_template');
const DictionaryController = require('./dictionary');
const RegisterController = require('./register');
const MessageController = require('./message');
const UserInboxController = require('./user_inbox');
const UserController = require('./user');
const UnitController = require('./unit');
const UnitAccessController = require('./unit_access');
const ExternalServicesController = require('./external_services');
const PaymentController = require('./payment');
const ExternalReaderController = require('./external_reader');
const UIFilterController = require('./ui_filter');
const CustomInterfaceController = require('./custom_interface');
const FavoritesController = require('./favorites');
const LocalizationLanguageController = require('./localization_language');
const LocalizationTextController = require('./localization_text');
const ProtectedFileController = require('./protected_file');
const KycController = require('./kyc');

// Constants.
const CONTROLLERS_CLASSES_LIST = {
  Controller,
  PingController,
  ModuleController,
  MonitorController,
  AuthController,
  RedirectController,
  WorkflowController,
  TaskController,
  DocumentController,
  WorkflowLogController,
  WorkflowTemplateCategoryController,
  WorkflowTemplateController,
  TaskTemplateController,
  DocumentTemplateController,
  DictionaryController,
  RegisterController,
  MessageController,
  UserInboxController,
  UserController,
  UnitController,
  UnitAccessController,
  ExternalServicesController,
  PaymentController,
  ExternalReaderController,
  UIFilterController,
  CustomInterfaceController,
  FavoritesController,
  KycController,
};

class Controllers {
  /**
   * Controllers constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!Controllers.singleton) {
      this.config = config;
      this.initControllers();
      Controllers.singleton = this;
    }
    return Controllers.singleton;
  }

  /**
   * Classes list.
   */
  static get List() {
    return CONTROLLERS_CLASSES_LIST;
  }

  /**
   * Init controllers.
   * @private
   */
  initControllers() {
    // Define controllers classses.
    const controllersByNames = {
      ping: PingController,
      module: ModuleController,
      monitor: MonitorController,
      auth: AuthController,
      redirect: RedirectController,
      workflow: WorkflowController,
      task: TaskController,
      document: DocumentController,
      workflowLog: WorkflowLogController,
      workflowTemplateCategory: WorkflowTemplateCategoryController,
      workflowTemplate: WorkflowTemplateController,
      taskTemplate: TaskTemplateController,
      documentTemplate: DocumentTemplateController,
      dictionary: DictionaryController,
      register: RegisterController,
      message: MessageController,
      userInbox: UserInboxController,
      user: UserController,
      unit: UnitController,
      unitAccess: UnitAccessController,
      externalServices: ExternalServicesController,
      payment: PaymentController,
      externalReader: ExternalReaderController,
      uiFilter: UIFilterController,
      customInterface: CustomInterfaceController,
      favorites: FavoritesController,
      localizationLanguage: LocalizationLanguageController,
      localizationText: LocalizationTextController,
      protectedFile: ProtectedFileController,
      kyc: KycController,
    };

    // Init controllers.
    this.controllers = Object.entries(controllersByNames)
      .map(v => {
        const name = v[0];
        const initializedController = new v[1](this.config);
        initializedController.name = name;
        return [name, initializedController];
      })
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
  }

  /**
   * Auth controller.
   * @returns {AuthController} Auth controller.
   */
  get auth() { return this.controllers.auth; }

  /**
   * Get handler.
   * @param {string} controllerName Controller name.
   * @param {string} methodName Method name.
   * @returns {function} Controller handler.
   */
  getHandler(controllerName, methodName, methodHandlerName) {
    // Define controller.
    const controller = this.controllers[controllerName];
    if (!controller) {
      return;
    }

    // Define method.
    const method = methodHandlerName? controller.methodHandler(methodHandlerName) : controller[methodName];
    if (!method) {
      return;
    }

    // Return method with controller's context.
    const handler = method.bind(controller);
    return handler;
  }
}

module.exports = Controllers;
