
import { Controller } from './controller';
import { PingController } from './ping';
import { ModuleController } from './module';
import { MonitorController } from './monitor';
import { AuthController } from './auth';
import { RedirectController } from './redirect';
import { WorkflowController } from './workflow';
import { TaskController } from './task';
import { DocumentController } from './document';
import { WorkflowLogController } from './workflow_log';
import { WorkflowTemplateCategoryController } from './workflow_template_category';
import { WorkflowTemplateController } from './workflow_template';
import { TaskTemplateController } from './task_template';
import { DocumentTemplateController } from './document_template';
import { DictionaryController } from './dictionary';
import { RegisterController } from './register';
import { MessageController } from './message';
import { UserInboxController } from './user_inbox';
import { UserController } from './user';
import { UnitController } from './unit';
import { UnitAccessController } from './unit_access';
import { ExternalServicesController } from './external_services';
import { PaymentController } from './payment';
import { ExternalReaderController } from './external_reader';
import { UIFilterController } from './ui_filter';
import { CustomInterfaceController } from './custom_interface';
import { FavoritesController } from './favorites';
import { LocalizationLanguageController } from './localization_language';
import { LocalizationTextController } from './localization_text';
import { ProtectedFileController } from './protected_file';
import { KycController } from './kyc';

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

export class Controllers {
  private static singleton: Controllers;

  config: any;
  controllers: any;

  /**
   * Controllers constructor.
   * @param {object} config Config object.
   */
  constructor(config: any) {
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
    const controllersByNames: Record<string, any> = {
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
            const n: Record<string, any> = {};
            n[v[0] as string] = v[1];
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
  getHandler(controllerName: string, methodName: string, methodHandlerName?: string) {
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

