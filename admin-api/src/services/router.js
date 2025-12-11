const express = require('express');
const proxy = require('express-http-proxy');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');

const AppIdentHeaders = require('../lib/app_ident_headers');
const PingController = require('../controllers/ping');
const AuthController = require('../controllers/auth');
const UserController = require('../controllers/user');
const RedirectController = require('../controllers/redirect');
const RegisterController = require('../controllers/register');
const BpmnWorkflowController = require('../controllers/bpmn_workflow');
const WorkflowLogController = require('../controllers/workflow_log');
const WorkflowStatusController = require('../controllers/workflow_status');
const WorkflowController = require('../controllers/workflow');
const WorkflowProcessController = require('../controllers/workflow_process');
const WorkflowTagController = require('../controllers/workflow_tag');
const TaskController = require('../controllers/task');
const EventTypeController = require('../controllers/event_type');
const EventController = require('../controllers/event');
const GatewayTypeController = require('../controllers/gateway_type');
const GatewayController = require('../controllers/gateway');
const WorkflowCategoryController = require('../controllers/workflow_category');
const UnitController = require('../controllers/unit');
const UnitAccessController = require('../controllers/unit_access');
const NumberTemplateController = require('../controllers/number_template');
const CustomLogController = require('../controllers/custom_log');
const AccessHistoryController = require('../controllers/access_history');
const LoginHistoryController = require('../controllers/login_history');
const UserAdminActionController = require('../controllers/user_admin_action');
const UIFilterController = require('../controllers/ui_filter');
const CustomInterfaceController = require('../controllers/custom_interface');
const ProxyItemController = require('../controllers/proxy_item');
const MessageTemplateController = require('../controllers/message_template');
const SqlReportsController = require('../controllers/sql_reports');
const StatController = require('../controllers/stat');
const FavoritesController = require('../controllers/favorites');
const SnippetsController = require('../controllers/snippets');
const AssetsController = require('../controllers/assets');
const MassMessagesMailingController = require('../controllers/mass_messages_mailing');
const LocalizationLanguageController = require('../controllers/localization_language');
const LocalizationTextController = require('../controllers/localization_text');
const UserSettingsController = require('../controllers/user_settings');
const Validators = require('../validators');
const { asyncLocalStorageMiddleware } = require('../lib/async_local_storage');
const {
  UNIT_ADMIN_UNIT,
  SECURITY_ADMIN_UNIT,
  SYSTEM_ADMIN_UNIT,
  SUPPORT_ADMIN_UNIT,
  READONLY_SECURITY_ADMIN_UNIT,
  READONLY_SYSTEM_ADMIN_UNIT,
  READONLY_SUPPORT_ADMIN_UNIT,
  WORKFLOW_SYSTEM_ADMIN_UNIT,
  WORKFLOW_SUPPORT_ADMIN_UNIT,
  ELASTIC_ADMIN,
  SNIPPETS_ADMIN_UNIT,
  TAG_ADMIN_UNIT,
} = require('../constants/unit');

/**
 * Router service.
 */
class RouterService {
  /**
   * Route service constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!RouterService.singleton) {
      this.config = config;
      RouterService.singleton = this;
    }

    // Return singleton.
    return RouterService.singleton;
  }

  /**
   * Init.
   */
  async init() {
    // Init Express app.
    const app = express();

    app.use(asyncLocalStorageMiddleware);

    // Add gzip support
    app.use(compression());

    // Save request info to log.
    app.use(log.logRouter.bind(log));

    // Allow CORS.
    app.use(
      cors({
        origin: '*',
        methods: 'GET, POST, PUT, DELETE',
        allowedHeaders:
          'Origin, X-Requested-With, Content-Type, Accept, token, Authorization, debug-user-id, Last-Workflow-History-Id, x-custom-lang',
        exposedHeaders: 'Name, Version, Last-Workflow-History-Id',
      }),
    );

    app.use(bodyParser.json({ limit: this.config.server.maxBodySize }));

    // App info in headers.
    AppIdentHeaders.add(app, config);

    // Init routes.
    this.controllers = this.initRoutes(app);

    // Start listening.
    await this.listen(app);

    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws) => {
      ws.data = {};

      ws.send('user connected');

      ws.on('message', (message) => {
        try {
          message = JSON.parse(message);
        } catch (error) {
          log.save('websocket-parse-message-error', error.message);
        }
        try {
          this.wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(typeof message === 'object' ? JSON.stringify(message) : message);
            }
          });

          ws.message = message;

          log.save('websocket-message', ws.message);
        } catch (error) {
          log.save('websocket-error', error.message);
        }
      });
    });
  }

  /**
   * Init routes.
   * @private
   * @param {object} app Express app.
   */
  initRoutes(app) {
    // Init controllers.
    const pingController = new PingController(this.config);
    const authController = new AuthController(this.config);
    const userController = new UserController(this.config);
    const redirectController = new RedirectController(this.config);
    const registerController = new RegisterController(this.config);
    const bpmnWorkflowController = new BpmnWorkflowController(this.config);
    const workflowLogController = new WorkflowLogController(this.config);
    const workflowController = new WorkflowController(this.config);
    const workflowProcessController = new WorkflowProcessController(this.config);
    const workflowTagController = new WorkflowTagController(this.config);
    const taskController = new TaskController(this.config);
    const eventTypeController = new EventTypeController(this.config);
    const eventController = new EventController(this.config);
    const gatewayTypeController = new GatewayTypeController(this.config);
    const gatewayController = new GatewayController(this.config);
    const workflowStatusController = new WorkflowStatusController(this.config);
    const workflowCategoryController = new WorkflowCategoryController(this.config);
    const unitController = new UnitController(this.config);
    const unitAccessController = new UnitAccessController(this.config);
    const numberTemplateController = new NumberTemplateController(this.config);
    const customLogController = new CustomLogController(this.config);
    const accessHistoryController = new AccessHistoryController(this.config);
    const loginHistoryController = new LoginHistoryController(this.config);
    const userAdminActionController = new UserAdminActionController(this.config);
    const uiFilterController = new UIFilterController(this.config);
    const customInterfaceController = new CustomInterfaceController(this.config);
    const proxyItemController = new ProxyItemController(this.config);
    const messageTemplateController = new MessageTemplateController(this.config);
    const sqlReportsController = new SqlReportsController(this.config);
    const statController = new StatController(this.config);
    const favoritesController = new FavoritesController(this.config);
    const snippetsController = new SnippetsController(this.config);
    const assetsController = new AssetsController(this.config);
    const massMessagesMailingController = new MassMessagesMailingController(this.config);
    const localizationLanguageController = new LocalizationLanguageController(this.config);
    const localizationTextController = new LocalizationTextController(this.config);
    const userSettingsController = new UserSettingsController(this.config);

    // Init validators.
    const validators = new Validators(this.config);

    // Define admin roles list.
    const { clientId } = this.config.auth;
    const adminRoles = ['admin', `admin-${clientId}`];

    // Init routes.
    app.get('/test/ping', pingController.ping.bind(pingController));
    app.get('/test/ping/services', pingController.pingServices.bind(pingController));

    app.post('/auth/login', authController.login.bind(authController));
    app.get('/auth/me', authController.getCheckMiddleware(adminRoles), authController.me.bind(authController));
    app.post('/local/change_password', authController.getCheckMiddleware(adminRoles), authController.changePassword.bind(authController));

    app.get('/redirect/auth', redirectController.auth.bind(redirectController));
    app.get('/redirect/logout', redirectController.logout.bind(redirectController));

    app.get(
      '/registers/keys',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'getKeysWithPagination'),
      validators.getValidationResultHandler(),
      registerController.getKeysWithPagination.bind(registerController),
    );
    app.get(
      '/registers/keys/all',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'getKeys'),
      validators.getValidationResultHandler(),
      registerController.getKeys.bind(registerController),
    );
    app.get(
      '/registers/keys/synced',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'getSyncedKeys'),
      validators.getValidationResultHandler(),
      registerController.getSyncedKeys.bind(registerController),
    );
    app.put(
      '/registers/keys/:key_id/mapping',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, ELASTIC_ADMIN]),
      validators.getHandler('register', 'updateIndexMapping'),
      validators.getValidationResultHandler(),
      registerController.updateIndexMapping.bind(registerController),
    );
    app.get(
      '/registers/keys/synced/all',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, SUPPORT_ADMIN_UNIT, READONLY_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('register', 'getAllSyncedKeys'),
      validators.getValidationResultHandler(),
      registerController.getAllSyncedKeys.bind(registerController),
    );
    app.get(
      '/registers/keys/:key_id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'findKeyById'),
      validators.getValidationResultHandler(),
      registerController.findKeyById.bind(registerController),
    );
    app.put(
      '/registers/keys/:key_id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'updateKeyById'),
      validators.getValidationResultHandler(),
      registerController.updateKeyById.bind(registerController),
    );
    app.delete(
      '/registers/keys/:key_id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'deleteKeyById'),
      validators.getValidationResultHandler(),
      registerController.deleteKeyById.bind(registerController),
    );
    app.post(
      '/registers/keys',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'createKey'),
      validators.getValidationResultHandler(),
      registerController.createKey.bind(registerController),
    );
    app.post(
      '/registers/keys/:key_id/reindex',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'reindexByKeyId'),
      validators.getValidationResultHandler(),
      registerController.reindexByKeyId.bind(registerController),
    );
    app.post(
      '/registers/keys/:key_id/afterhandlers-reindex',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'afterHandlersReindexByKeyId'),
      validators.getValidationResultHandler(),
      registerController.afterHandlersReindexByKeyId.bind(registerController),
    );
    app.get(
      '/registers',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'getRegistersWithPagination'),
      validators.getValidationResultHandler(),
      registerController.getRegistersWithPagination.bind(registerController),
    );
    app.get(
      '/registers/all',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'getRegisters'),
      validators.getValidationResultHandler(),
      registerController.getRegisters.bind(registerController),
    );
    app.post(
      '/registers',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'createRegister'),
      validators.getValidationResultHandler(),
      registerController.createRegister.bind(registerController),
    );
    app.get(
      '/registers/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'findRegisterById'),
      validators.getValidationResultHandler(),
      registerController.findRegisterById.bind(registerController),
    );
    app.put(
      '/registers/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'updateRegisterById'),
      validators.getValidationResultHandler(),
      registerController.updateRegisterById.bind(registerController),
    );
    app.delete(
      '/registers/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'deleteRegisterById'),
      validators.getValidationResultHandler(),
      registerController.deleteRegisterById.bind(registerController),
    );
    app.get(
      '/registers/keys/:key_id/records',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'getRecords'),
      validators.getValidationResultHandler(),
      registerController.getRecords.bind(registerController),
    );
    app.get(
      '/registers/keys/:key_id/records/:record_id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'findRecordById'),
      validators.getValidationResultHandler(),
      registerController.findRecordById.bind(registerController),
    );
    app.put(
      '/registers/keys/:key_id/records/:record_id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'updateRecordById'),
      validators.getValidationResultHandler(),
      registerController.updateRecordById.bind(registerController),
    );
    app.delete(
      '/registers/keys/:key_id/records/:record_id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'deleteRecordById'),
      validators.getValidationResultHandler(),
      registerController.deleteRecordById.bind(registerController),
    );
    app.post(
      '/registers/keys/:key_id/records',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'createRecord'),
      validators.getValidationResultHandler(),
      registerController.createRecord.bind(registerController),
    );
    app.post(
      '/registers/records/bulk',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'importBulkRecords'),
      validators.getValidationResultHandler(),
      registerController.importBulkRecords.bind(registerController),
    );
    app.get(
      '/registers/:id/export',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'export'),
      validators.getValidationResultHandler(),
      registerController.export.bind(registerController),
    );
    app.post(
      '/registers/import',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'import'),
      validators.getValidationResultHandler(),
      registerController.import.bind(registerController),
    );
    app.get(
      '/registers/:id/stream-export',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'export'),
      validators.getValidationResultHandler(),
      registerController.streamExport.bind(registerController),
    );
    app.post(
      '/registers/stream-import',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'import'),
      validators.getValidationResultHandler(),
      registerController.import.bind(registerController),
    );
    app.get(
      '/registers/:id/keys/:keyId/export-xlsx',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'exportXlsx'),
      validators.getValidationResultHandler(),
      registerController.exportXlsx.bind(registerController),
    );
    app.post(
      '/registers/:id/keys/:keyId/import-xlsx',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('register', 'importXlsx'),
      validators.getValidationResultHandler(),
      registerController.importXlsx.bind(registerController),
    );

    app.get(
      '/users',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, READONLY_SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'getUsers'),
      validators.getValidationResultHandler(),
      userController.getUsers.bind(userController),
    );
    app.post(
      '/users/:id/block',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'block'),
      validators.getValidationResultHandler(),
      userController.block.bind(userController),
    );
    app.post(
      '/users/:id/unblock',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'unblock'),
      validators.getValidationResultHandler(),
      userController.unblock.bind(userController),
    );
    app.post(
      '/users/:id/set-admin',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'setAdmin'),
      validators.getValidationResultHandler(),
      userController.setAdmin.bind(userController),
    );
    app.post(
      '/users/:id/unset-admin',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'unsetAdmin'),
      validators.getValidationResultHandler(),
      userController.unsetAdmin.bind(userController),
    );
    app.post(
      '/users/:id/set-password',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'setPassword'),
      validators.getValidationResultHandler(),
      userController.setPassword.bind(userController),
    );
    app.post(
      '/users/:id/enforce-2fa',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'enforce2fa'),
      validators.getValidationResultHandler(),
      userController.enforce2fa.bind(userController),
    );
    app.post(
      '/users/:id/disable-2fa',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'disable2fa'),
      validators.getValidationResultHandler(),
      userController.disable2fa.bind(userController),
    );
    app.get(
      '/users/:id',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, READONLY_SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'findById'),
      validators.getValidationResultHandler(),
      userController.findById.bind(userController),
    );
    app.put(
      '/users/:id',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'update'),
      validators.getValidationResultHandler(),
      userController.update.bind(userController),
    );
    app.delete(
      '/users/:id',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'deleteUser'),
      validators.getValidationResultHandler(),
      userController.deleteUser.bind(userController),
    );
    app.post(
      '/users/create_local',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'createLocalUser'),
      validators.getValidationResultHandler(),
      userController.createLocalUser.bind(userController),
    );
    app.post(
      '/users/search',
      authController.getCheckMiddleware(adminRoles, [
        UNIT_ADMIN_UNIT,
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
      ]),
      validators.getHandler('user', 'search'),
      validators.getValidationResultHandler(),
      userController.search.bind(userController),
    );
    app.post(
      '/users/message/to-all',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'sendMessageToAllUsers'),
      validators.getValidationResultHandler(),
      userController.sendMessageToAllUsers.bind(userController),
    );
    app.get(
      '/users/message/to-all',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, READONLY_SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'getMessagesForAllUsers'),
      validators.getValidationResultHandler(),
      userController.getMessagesForAllUsers.bind(userController),
    );
    app.delete(
      '/users/message/to-all/:id',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('user', 'deleteMessageForAllUsers'),
      validators.getValidationResultHandler(),
      userController.deleteMessageForAllUsers.bind(userController),
    );

    app.get(
      '/number-templates',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('numberTemplate', 'getAll'),
      validators.getValidationResultHandler(),
      numberTemplateController.getAll.bind(numberTemplateController),
    );
    app.post(
      '/number-templates',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('numberTemplate', 'create'),
      validators.getValidationResultHandler(),
      numberTemplateController.create.bind(numberTemplateController),
    );
    app.post(
      '/number-templates/import',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('numberTemplate', 'import'),
      validators.getValidationResultHandler(),
      numberTemplateController.import.bind(numberTemplateController),
    );
    app.get(
      '/number-templates/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('numberTemplate', 'findById'),
      validators.getValidationResultHandler(),
      numberTemplateController.findById.bind(numberTemplateController),
    );
    app.get(
      '/number-templates/:id/export',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('numberTemplate', 'export'),
      validators.getValidationResultHandler(),
      numberTemplateController.export.bind(numberTemplateController),
    );
    app.put(
      '/number-templates/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('numberTemplate', 'update'),
      validators.getValidationResultHandler(),
      numberTemplateController.update.bind(numberTemplateController),
    );
    app.delete(
      '/number-templates/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('numberTemplate', 'delete'),
      validators.getValidationResultHandler(),
      numberTemplateController.delete.bind(numberTemplateController),
    );

    app.get(
      '/units',
      authController.getCheckMiddleware(adminRoles, [
        UNIT_ADMIN_UNIT,
        SECURITY_ADMIN_UNIT,
        SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('unit', 'getAllWithPagination'),
      validators.getValidationResultHandler(),
      unitController.getAllWithPagination.bind(unitController),
    );
    app.get(
      '/units/all',
      authController.getCheckMiddleware(adminRoles, [
        UNIT_ADMIN_UNIT,
        SECURITY_ADMIN_UNIT,
        SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        ELASTIC_ADMIN,
        SNIPPETS_ADMIN_UNIT,
      ]),
      validators.getHandler('unit', 'getAll'),
      validators.getValidationResultHandler(),
      unitController.getAll.bind(unitController),
    );
    app.post(
      '/units',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'create'),
      validators.getValidationResultHandler(),
      unitController.create.bind(unitController),
    );
    app.post(
      '/units/export',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'export'),
      validators.getValidationResultHandler(),
      unitController.export.bind(unitController),
    );
    app.post(
      '/units/import',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'import'),
      validators.getValidationResultHandler(),
      unitController.import.bind(unitController),
    );
    app.get(
      '/units/:id',
      authController.getCheckMiddleware(adminRoles, [UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT, READONLY_SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'findById'),
      validators.getValidationResultHandler(),
      unitController.findById.bind(unitController),
    );
    app.put(
      '/units/:id',
      authController.getCheckMiddleware(adminRoles, [UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'update'),
      validators.getValidationResultHandler(),
      unitController.update.bind(unitController),
    );
    app.delete(
      '/units/:id',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'delete'),
      validators.getValidationResultHandler(),
      unitController.delete.bind(unitController),
    );
    app.post(
      '/units/:id/heads',
      authController.getCheckMiddleware(adminRoles, [UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'addHeads'),
      validators.getValidationResultHandler(),
      unitController.addHeads.bind(unitController),
    );
    app.delete(
      '/units/:id/heads',
      authController.getCheckMiddleware(adminRoles, [UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'removeHeads'),
      validators.getValidationResultHandler(),
      unitController.removeHeads.bind(unitController),
    );
    app.post(
      '/units/:id/members',
      authController.getCheckMiddleware(adminRoles, [UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'addMembers'),
      validators.getValidationResultHandler(),
      unitController.addMembers.bind(unitController),
    );
    app.delete(
      '/units/:id/members',
      authController.getCheckMiddleware(adminRoles, [UNIT_ADMIN_UNIT, SECURITY_ADMIN_UNIT]),
      validators.getHandler('unit', 'removeMembers'),
      validators.getValidationResultHandler(),
      unitController.removeMembers.bind(unitController),
    );

    app.get(
      '/unit-access',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
      ]),
      validators.getHandler('unitAccess', 'getUnitAccess'),
      validators.getValidationResultHandler(),
      unitAccessController.getUnitAccess.bind(unitAccessController),
    );
    app.get(
      '/unit-access/:id',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
      ]),
      validators.getHandler('unitAccess', 'findUnitAccessById'),
      validators.getValidationResultHandler(),
      unitAccessController.findUnitAccessById.bind(unitAccessController),
    );
    app.post(
      '/unit-access',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, SYSTEM_ADMIN_UNIT]),
      validators.getHandler('unitAccess', 'createUnitAccess'),
      validators.getValidationResultHandler(),
      unitAccessController.createUnitAccess.bind(unitAccessController),
    );
    app.put(
      '/unit-access/:id',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, SYSTEM_ADMIN_UNIT]),
      validators.getHandler('unitAccess', 'updateUnitAccessById'),
      validators.getValidationResultHandler(),
      unitAccessController.updateUnitAccessById.bind(unitAccessController),
    );
    app.delete(
      '/unit-access/:id',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, SYSTEM_ADMIN_UNIT]),
      validators.getHandler('unitAccess', 'deleteUnitAccessById'),
      validators.getValidationResultHandler(),
      unitAccessController.deleteUnitAccessById.bind(unitAccessController),
    );

    app.post(
      '/tasks',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('task', 'create'),
      validators.getValidationResultHandler(),
      taskController.create.bind(taskController),
    );
    app.get(
      '/tasks/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('task', 'findById'),
      validators.getValidationResultHandler(),
      taskController.findById.bind(taskController),
    );
    app.delete(
      '/tasks/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('task', 'delete'),
      validators.getValidationResultHandler(),
      taskController.delete.bind(taskController),
    );

    app.get(
      '/event-types',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      eventTypeController.getAll.bind(eventTypeController),
    );

    app.post(
      '/events',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('event', 'create'),
      validators.getValidationResultHandler(),
      eventController.create.bind(eventController),
    );
    app.get(
      '/events/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('event', 'findById'),
      validators.getValidationResultHandler(),
      eventController.findById.bind(eventController),
    );
    app.delete(
      '/events/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('event', 'delete'),
      validators.getValidationResultHandler(),
      eventController.delete.bind(eventController),
    );
    app.post(
      '/events/:id/skip-delay',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('event', 'skipDelay'),
      validators.getValidationResultHandler(),
      eventController.skipDelay.bind(eventController),
    );

    app.get(
      '/gateway-types',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      gatewayTypeController.getAll.bind(gatewayTypeController),
    );

    app.post(
      '/gateways',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('gateway', 'create'),
      validators.getValidationResultHandler(),
      gatewayController.create.bind(gatewayController),
    );
    app.get(
      '/gateways/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('gateway', 'findById'),
      validators.getValidationResultHandler(),
      gatewayController.findById.bind(gatewayController),
    );
    app.delete(
      '/gateways/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('gateway', 'delete'),
      validators.getValidationResultHandler(),
      gatewayController.delete.bind(gatewayController),
    );

    app.get(
      '/workflow-statuses',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
      ]),
      workflowStatusController.getAll.bind(workflowStatusController),
    );

    app.get(
      '/workflows/categories',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowCategory', 'getAll'),
      validators.getValidationResultHandler(),
      workflowCategoryController.getAll.bind(workflowCategoryController),
    );
    app.post(
      '/workflows/categories',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('workflowCategory', 'create'),
      validators.getValidationResultHandler(),
      workflowCategoryController.create.bind(workflowCategoryController),
    );
    app.get(
      '/workflows/categories/:id',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowCategory', 'findById'),
      validators.getValidationResultHandler(),
      workflowCategoryController.findById.bind(workflowCategoryController),
    );
    app.put(
      '/workflows/categories/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('workflowCategory', 'update'),
      validators.getValidationResultHandler(),
      workflowCategoryController.update.bind(workflowCategoryController),
    );
    app.delete(
      '/workflows/categories/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('workflowCategory', 'delete'),
      validators.getValidationResultHandler(),
      workflowCategoryController.delete.bind(workflowCategoryController),
    );

    app.get(
      '/workflows',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
      ]),
      validators.getHandler('workflow', 'getAll'),
      validators.getValidationResultHandler(),
      workflowController.getAll.bind(workflowController),
    );
    app.get(
      '/workflows/search',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
      ]),
      validators.getHandler('workflow', 'getAllBySchemaSearch'),
      validators.getValidationResultHandler(),
      workflowController.getAllBySchemaSearch.bind(workflowController),
    );
    app.post(
      '/workflows',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('workflow', 'create'),
      validators.getValidationResultHandler(),
      workflowController.create.bind(workflowController),
    );
    app.put(
      '/workflows/:id/set-tags',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, SYSTEM_ADMIN_UNIT, TAG_ADMIN_UNIT]),
      validators.getHandler('workflow', 'setTags'),
      validators.getValidationResultHandler(),
      workflowController.setWorkflowTemplateTags.bind(workflowController),
    );
    app.get(
      '/workflows/:id',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
      ]),
      validators.getHandler('workflow', 'findById'),
      validators.getValidationResultHandler(),
      workflowController.findById.bind(workflowController),
    );
    app.put(
      '/workflows/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('workflow', 'update'),
      validators.getValidationResultHandler(),
      workflowController.update.bind(workflowController),
    );
    app.delete(
      '/workflows/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('workflow', 'delete'),
      validators.getValidationResultHandler(),
      workflowController.delete.bind(workflowController),
    );

    app.get(
      '/workflow-logs/reindex',
      authController.getCheckMiddleware(adminRoles, [ELASTIC_ADMIN]),
      validators.getHandler('workflow', 'reindexList'),
      validators.getValidationResultHandler(),
      workflowLogController.reindexList.bind(workflowLogController),
    );

    app.post(
      '/workflow-logs/reindex',
      authController.getCheckMiddleware(adminRoles, [ELASTIC_ADMIN]),
      validators.getHandler('workflow', 'reindexForPeriod'),
      validators.getValidationResultHandler(),
      workflowLogController.reindexForPeriod.bind(workflowLogController),
    );

    app.get(
      '/workflow-logs/reindex/stats',
      authController.getCheckMiddleware(adminRoles, [ELASTIC_ADMIN]),
      validators.getHandler('workflowLog', 'reindexStatistics'),
      validators.getValidationResultHandler(),
      workflowLogController.reindexStatistics.bind(workflowLogController),
    );

    app.get(
      '/workflow-logs/manual-reindex-status',
      authController.getCheckMiddleware(adminRoles, [ELASTIC_ADMIN]),
      workflowLogController.getManualReindexForPeriodStatus.bind(workflowLogController),
    );

    app.post(
      '/workflow-logs/manual-reindex',
      authController.getCheckMiddleware(adminRoles, [ELASTIC_ADMIN]),
      validators.getHandler('workflow', 'manualReindexForPeriod'),
      validators.getValidationResultHandler(),
      workflowLogController.manualReindexForPeriod.bind(workflowLogController),
    );

    app.get(
      '/workflow-logs/:id',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowLog', 'getWorkflowLogsByWorkflowId'),
      validators.getValidationResultHandler(),
      workflowLogController.getWorkflowLogsByWorkflowId.bind(workflowLogController),
    );

    app.get(
      '/workflow-processes',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowProcess', 'getAll'),
      validators.getValidationResultHandler(),
      workflowProcessController.getAll.bind(workflowProcessController),
    );
    app.get(
      '/workflow-processes/tasks',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowProcess', 'getTasks'),
      validators.getValidationResultHandler(),
      workflowProcessController.getTasks.bind(workflowProcessController),
    );
    app.get(
      '/workflow-processes/:id',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowProcess', 'findById'),
      validators.getValidationResultHandler(),
      workflowProcessController.findById.bind(workflowProcessController),
    );
    app.post(
      '/workflow-processes/:id/continue',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'continueProcess'),
      validators.getValidationResultHandler(),
      workflowProcessController.continueProcess.bind(workflowProcessController),
    );
    app.post(
      '/workflow-processes/continue-bulk',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'continueProcessBulk'),
      validators.getValidationResultHandler(),
      workflowProcessController.continueProcessBulk.bind(workflowProcessController),
    );
    app.post(
      '/workflow-processes/:id/restart',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'restartProcessFromStep'),
      validators.getValidationResultHandler(),
      workflowProcessController.restartProcessFromStep.bind(workflowProcessController),
    );
    app.post(
      '/workflow-processes/restart-bulk',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'restartProcessFromStepBulk'),
      validators.getValidationResultHandler(),
      workflowProcessController.restartProcessFromStepBulk.bind(workflowProcessController),
    );
    app.post(
      '/workflow-processes/:id/clear',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'clearProcess'),
      validators.getValidationResultHandler(),
      workflowProcessController.clearProcess.bind(workflowProcessController),
    );
    app.put(
      '/workflow-processes/:id',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'update'),
      validators.getValidationResultHandler(),
      workflowProcessController.update.bind(workflowProcessController),
    );
    app.get(
      '/workflow-processes/:id/files/:fileId/p7s',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowProcess', 'downloadP7s'),
      validators.getValidationResultHandler(),
      workflowProcessController.downloadP7s.bind(workflowProcessController),
    );
    app.get(
      '/workflow-processes/:id/files/:fileId',
      authController.getCheckMiddleware(adminRoles, [
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowProcess', 'downloadFile'),
      validators.getValidationResultHandler(),
      workflowProcessController.downloadFile.bind(workflowProcessController),
    );
    app.put(
      '/workflow-processes/:id/tasks/:taskId',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'updateTask'),
      validators.getValidationResultHandler(),
      workflowProcessController.updateTask.bind(workflowProcessController),
    );
    app.post(
      '/workflow-processes/:id/events/:eventId/cancel',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, WORKFLOW_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'cancelEvent'),
      validators.getValidationResultHandler(),
      workflowProcessController.cancelEvent.bind(workflowProcessController),
    );

    app.delete(
      '/workflow-processes/:id/documents/:documentId/signatures',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflowProcess', 'deleteAllSignaturesFromDocument'),
      validators.getValidationResultHandler(),
      workflowProcessController.deleteAllSignaturesFromDocument.bind(workflowProcessController),
    );

    app.get(
      '/workflow-tags',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
        TAG_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowTag', 'getAll'),
      validators.getValidationResultHandler(),
      workflowTagController.getAll.bind(workflowTagController),
    );
    app.post(
      '/workflow-tags',
      authController.getCheckMiddleware(adminRoles, [TAG_ADMIN_UNIT]),
      validators.getHandler('workflowTag', 'create'),
      validators.getValidationResultHandler(),
      workflowTagController.create.bind(workflowTagController),
    );
    app.get(
      '/workflow-tags/:id',
      authController.getCheckMiddleware(adminRoles, [
        SYSTEM_ADMIN_UNIT,
        READONLY_SYSTEM_ADMIN_UNIT,
        WORKFLOW_SYSTEM_ADMIN_UNIT,
        SUPPORT_ADMIN_UNIT,
        READONLY_SUPPORT_ADMIN_UNIT,
        WORKFLOW_SUPPORT_ADMIN_UNIT,
        SECURITY_ADMIN_UNIT,
        READONLY_SECURITY_ADMIN_UNIT,
        SNIPPETS_ADMIN_UNIT,
        TAG_ADMIN_UNIT,
      ]),
      validators.getHandler('workflowTag', 'findById'),
      validators.getValidationResultHandler(),
      workflowTagController.findById.bind(workflowTagController),
    );
    app.put(
      '/workflow-tags/:id',
      authController.getCheckMiddleware(adminRoles, [TAG_ADMIN_UNIT]),
      validators.getHandler('workflowTag', 'update'),
      validators.getValidationResultHandler(),
      workflowTagController.update.bind(workflowTagController),
    );
    app.delete(
      '/workflow-tags/:id',
      authController.getCheckMiddleware(adminRoles, [TAG_ADMIN_UNIT]),
      validators.getHandler('workflowTag', 'delete'),
      validators.getValidationResultHandler(),
      workflowTagController.delete.bind(workflowTagController),
    );

    app.get(
      '/bpmn-workflows/:id/export',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('bpmnWorkflow', 'export'),
      validators.getValidationResultHandler(),
      bpmnWorkflowController.export.bind(bpmnWorkflowController),
    );
    app.get(
      '/bpmn-workflows/:id/copy/preparation',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('bpmnWorkflow', 'copyPreparation'),
      validators.getValidationResultHandler(),
      bpmnWorkflowController.copyPreparation.bind(bpmnWorkflowController),
    );
    app.post(
      '/bpmn-workflows/:id/copy',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('bpmnWorkflow', 'copy'),
      validators.getValidationResultHandler(),
      bpmnWorkflowController.copy.bind(bpmnWorkflowController),
    );
    app.get(
      '/bpmn-workflows/:id/versions',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('bpmnWorkflow', 'getVersions'),
      validators.getValidationResultHandler(),
      bpmnWorkflowController.getVersions.bind(bpmnWorkflowController),
    );
    app.get(
      '/bpmn-workflows/:id/versions/:version',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('bpmnWorkflow', 'findByVersion'),
      validators.getValidationResultHandler(),
      bpmnWorkflowController.findByVersion.bind(bpmnWorkflowController),
    );
    app.post(
      '/bpmn-workflows/:id/versions',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('bpmnWorkflow', 'saveVersion'),
      validators.getValidationResultHandler(),
      bpmnWorkflowController.saveVersion.bind(bpmnWorkflowController),
    );
    app.post(
      '/bpmn-workflows/import',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('bpmnWorkflow', 'import'),
      validators.getValidationResultHandler(),
      bpmnWorkflowController.import.bind(bpmnWorkflowController),
    );

    app.post(
      '/bpmn-workflows/:id/errors-subscribers',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflow', 'subscribeOnWorkflowErrors'),
      validators.getValidationResultHandler(),
      workflowController.subscribeOnWorkflowErrors.bind(workflowController),
    );
    app.delete(
      '/bpmn-workflows/:id/errors-subscribers',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT]),
      validators.getHandler('workflow', 'unsubscribeFromWorkflowErrors'),
      validators.getValidationResultHandler(),
      workflowController.unsubscribeFromWorkflowErrors.bind(workflowController),
    );

    app.get(
      '/custom-logs',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT]),
      validators.getHandler('customLog', 'getAll'),
      customLogController.getAll.bind(customLogController),
    );

    app.get(
      '/access-history',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, READONLY_SECURITY_ADMIN_UNIT]),
      validators.getHandler('accessHistory', 'getAll'),
      accessHistoryController.getAll.bind(accessHistoryController),
    );

    app.get(
      '/login-history',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, READONLY_SECURITY_ADMIN_UNIT]),
      validators.getHandler('loginHistory', 'getList'),
      loginHistoryController.getList.bind(loginHistoryController),
    );

    app.get(
      '/user-admin-actions',
      authController.getCheckMiddleware(adminRoles, [SECURITY_ADMIN_UNIT, READONLY_SECURITY_ADMIN_UNIT]),
      validators.getHandler('userAdminAction', 'getList'),
      userAdminActionController.getList.bind(userAdminActionController),
    );

    app.get(
      '/user-settings',
      authController.getCheckMiddleware(adminRoles),
      validators.getHandler('userSettings', 'get'),
      userSettingsController.get.bind(userSettingsController),
    );
    app.post(
      '/user-settings',
      authController.getCheckMiddleware(adminRoles),
      validators.getHandler('userSettings', 'createOrUpdate'),
      userSettingsController.createOrUpdate.bind(userSettingsController),
    );

    app.post(
      '/unit/rules',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('unit', 'createRules'),
      unitController.createRules.bind(unitController),
    );
    app.put(
      '/unit/rules',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('unit', 'updateRulesByType'),
      unitController.updateRulesByType.bind(unitController),
    );
    app.get(
      '/unit/rules',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      unitController.getAllUnitRules.bind(unitController),
    );
    app.delete(
      '/unit/rules',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('unit', 'deleteRulesByType'),
      unitController.deleteRulesByType.bind(unitController),
    );

    app.get(
      '/ui-filters',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('uiFilter', 'getAll'),
      validators.getValidationResultHandler(),
      uiFilterController.getAll.bind(uiFilterController),
    );
    app.post(
      '/ui-filters',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('uiFilter', 'create'),
      validators.getValidationResultHandler(),
      uiFilterController.create.bind(uiFilterController),
    );
    app.get(
      '/ui-filters/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('uiFilter', 'findById'),
      validators.getValidationResultHandler(),
      uiFilterController.findById.bind(uiFilterController),
    );
    app.put(
      '/ui-filters/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('uiFilter', 'update'),
      validators.getValidationResultHandler(),
      uiFilterController.update.bind(uiFilterController),
    );
    app.delete(
      '/ui-filters/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('uiFilter', 'delete'),
      validators.getValidationResultHandler(),
      uiFilterController.delete.bind(uiFilterController),
    );

    app.get(
      '/custom-interfaces',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('customInterface', 'getAll'),
      validators.getValidationResultHandler(),
      customInterfaceController.getAll.bind(customInterfaceController),
    );
    app.post(
      '/custom-interfaces',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('customInterface', 'create'),
      validators.getValidationResultHandler(),
      customInterfaceController.create.bind(customInterfaceController),
    );
    app.get(
      '/custom-interfaces/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('customInterface', 'findById'),
      validators.getValidationResultHandler(),
      customInterfaceController.findById.bind(customInterfaceController),
    );
    app.put(
      '/custom-interfaces/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('customInterface', 'update'),
      validators.getValidationResultHandler(),
      customInterfaceController.update.bind(customInterfaceController),
    );
    app.delete(
      '/custom-interfaces/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('customInterface', 'delete'),
      validators.getValidationResultHandler(),
      customInterfaceController.delete.bind(customInterfaceController),
    );

    app.get(
      '/proxy-items',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('proxyItem', 'getAll'),
      validators.getValidationResultHandler(),
      proxyItemController.getAll.bind(proxyItemController),
    );
    app.post(
      '/proxy-items',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('proxyItem', 'create'),
      validators.getValidationResultHandler(),
      proxyItemController.create.bind(proxyItemController),
    );
    app.get(
      '/proxy-items/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('proxyItem', 'findById'),
      validators.getValidationResultHandler(),
      proxyItemController.findById.bind(proxyItemController),
    );
    app.put(
      '/proxy-items/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('proxyItem', 'update'),
      validators.getValidationResultHandler(),
      proxyItemController.update.bind(proxyItemController),
    );
    app.delete(
      '/proxy-items/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('proxyItem', 'delete'),
      validators.getValidationResultHandler(),
      proxyItemController.delete.bind(proxyItemController),
    );

    app.get(
      '/message-templates',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getValidationResultHandler(),
      messageTemplateController.getAll.bind(messageTemplateController),
    );
    app.post(
      '/message-templates',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('messageTemplate', 'create'),
      validators.getValidationResultHandler(),
      messageTemplateController.create.bind(messageTemplateController),
    );
    app.get(
      '/message-templates/export',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT]),
      validators.getHandler('messageTemplate', 'export'),
      validators.getValidationResultHandler(),
      messageTemplateController.export.bind(messageTemplateController),
    );
    app.post(
      '/message-templates/import',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('messageTemplate', 'import'),
      validators.getValidationResultHandler(),
      messageTemplateController.import.bind(messageTemplateController),
    );
    app.put(
      '/message-templates/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('messageTemplate', 'update'),
      validators.getValidationResultHandler(),
      messageTemplateController.update.bind(messageTemplateController),
    );
    app.delete(
      '/message-templates/:id',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('messageTemplate', 'delete'),
      validators.getValidationResultHandler(),
      messageTemplateController.delete.bind(messageTemplateController),
    );

    // get common statistic
    app.get(
      '/stat/:date',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('stat', 'getSqlReports'),
      validators.getValidationResultHandler(),
      statController.methodHandler('getStatByDate'),
    );

    // SQL-reports
    app.get(
      '/sql-reports',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, READONLY_SUPPORT_ADMIN_UNIT]),
      sqlReportsController.methodHandler('getAllSqlReports'),
    );
    app.get(
      '/sql-reports/:reportId',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT, READONLY_SUPPORT_ADMIN_UNIT]),
      validators.getHandler('sqlReports', 'getSqlReports'),
      validators.getValidationResultHandler(),
      sqlReportsController.methodHandler('getSqlReports'),
    );

    const favoritesMiddlewares = (method) => [
      authController.getCheckMiddleware(adminRoles),
      validators.getHandler('favorites', 'default'),
      validators.getValidationResultHandler(),
      favoritesController.methodHandler(method),
    ];
    app.get('/favorites/:entity_type', ...favoritesMiddlewares('getAll'));
    app.get('/favorites/:entity_type/:entity_id', ...favoritesMiddlewares('getOne'));
    app.post('/favorites', ...favoritesMiddlewares('add'));
    app.post('/favorites/:entity_type/:entity_id', ...favoritesMiddlewares('add'));
    app.delete('/favorites/:entity_type/:entity_id', ...favoritesMiddlewares('remove'));

    // Snippets.
    const snippetsMiddlewares = (method, isNeedSnippetsAdminUnit = true, isParseBody = true) => [
      authController.getCheckMiddleware(adminRoles, isNeedSnippetsAdminUnit ? [SNIPPETS_ADMIN_UNIT] : []),
      validators.getHandler('snippets', method),
      validators.getValidationResultHandler(),
      snippetsController.methodHandler(method, isParseBody),
    ];
    app.post('/snippets/export', ...snippetsMiddlewares('export'));
    app.post('/snippets/import', ...snippetsMiddlewares('import', true, false));
    app.get('/snippets', ...snippetsMiddlewares('getAll', false));
    app.get('/snippets/:id', ...snippetsMiddlewares('getOne', false));
    app.post('/snippets', ...snippetsMiddlewares('createOne'));
    app.put('/snippets/:id', ...snippetsMiddlewares('updateOne'));
    app.delete('/snippets/:id', ...snippetsMiddlewares('deleteOne'));
    app.get('/snippet-groups', ...snippetsMiddlewares('getAllGroups', false));
    app.get('/snippet-groups/:name', ...snippetsMiddlewares('getOneGroup', false));
    app.post('/snippet-groups', ...snippetsMiddlewares('createOneGroup'));
    app.put('/snippet-groups/:nameFromParams', ...snippetsMiddlewares('updateOneGroup'));
    app.delete('/snippet-groups/:name', ...snippetsMiddlewares('deleteOneGroup'));

    // Assets (with aliases for legacy/test compatibility)
    const assetsRoutes = [
      ['/assets/units', assetsController.getToUnits.bind(assetsController)],
      ['/assets/to-units', assetsController.getToUnits.bind(assetsController)],
      ['/assets/registers', assetsController.getToRegisters.bind(assetsController)],
      ['/assets/to-registers', assetsController.getToRegisters.bind(assetsController)],
    ];
    for (const [route, handler] of assetsRoutes) {
      app.get(
        route,
        authController.getCheckMiddleware(adminRoles, [], true),
        validators.getHandler('assets', route.includes('unit') ? 'getToUnits' : 'getToRegisters'),
        validators.getValidationResultHandler(),
        handler,
      );
    }

    app.post(
      '/mass-messages-mailing/send',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT]),
      validators.getHandler('massMessagesMailing', 'send'),
      validators.getValidationResultHandler(),
      massMessagesMailingController.send.bind(massMessagesMailingController),
    );

    app.get(
      '/mass-messages-mailing/get-list',
      authController.getCheckMiddleware(adminRoles, [SUPPORT_ADMIN_UNIT]),
      validators.getHandler('massMessagesMailing', 'getListWithPagination'),
      validators.getValidationResultHandler(),
      massMessagesMailingController.getListWithPagination.bind(massMessagesMailingController),
    );

    // Localization languages
    app.get(
      '/localization-languages',
      authController.getCheckMiddleware(adminRoles, []),
      validators.getHandler('localizationLanguage', 'getListWithPagination'),
      validators.getValidationResultHandler(),
      localizationLanguageController.getListWithPagination.bind(localizationLanguageController),
    );
    app.post(
      '/localization-languages/export',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationLanguage', 'export'),
      validators.getValidationResultHandler(),
      localizationLanguageController.export.bind(localizationLanguageController),
    );
    app.post(
      '/localization-languages/import',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationLanguage', 'import'),
      validators.getValidationResultHandler(),
      localizationLanguageController.import.bind(localizationLanguageController),
    );
    app.post(
      '/localization-languages',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationLanguage', 'create'),
      validators.getValidationResultHandler(),
      localizationLanguageController.create.bind(localizationLanguageController),
    );
    app.put(
      '/localization-languages/:code',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationLanguage', 'update'),
      validators.getValidationResultHandler(),
      localizationLanguageController.update.bind(localizationLanguageController),
    );
    app.delete(
      '/localization-languages/:code',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationLanguage', 'delete'),
      validators.getValidationResultHandler(),
      localizationLanguageController.delete.bind(localizationLanguageController),
    );

    // Localization texts.
    app.get(
      '/localization-texts',
      authController.getCheckMiddleware(adminRoles, []),
      validators.getHandler('localizationText', 'getListWithPagination'),
      validators.getValidationResultHandler(),
      localizationTextController.getListWithPagination.bind(localizationTextController),
    );
    // Localization texts.
    app.get(
      '/localization-texts-by-keys',
      authController.getCheckMiddleware(adminRoles, []),
      validators.getHandler('localizationText', 'getListByKeysWithPagination'),
      validators.getValidationResultHandler(),
      localizationTextController.getListByKeysWithPagination.bind(localizationTextController),
    );
    app.post(
      '/localization-texts/export',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationText', 'export'),
      validators.getValidationResultHandler(),
      localizationTextController.export.bind(localizationTextController),
    );
    app.post(
      '/localization-texts/import',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationText', 'import'),
      validators.getValidationResultHandler(),
      localizationTextController.import.bind(localizationTextController),
    );
    app.post(
      '/localization-texts',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationText', 'create'),
      validators.getValidationResultHandler(),
      localizationTextController.create.bind(localizationTextController),
    );
    app.put(
      '/localization-texts/:localization_language_code/:key',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationText', 'update'),
      validators.getValidationResultHandler(),
      localizationTextController.update.bind(localizationTextController),
    );
    app.delete(
      '/localization-texts/:localization_language_code/:key',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      validators.getHandler('localizationText', 'delete'),
      validators.getValidationResultHandler(),
      localizationTextController.delete.bind(localizationTextController),
    );

    // Register proxy.
    app.use(
      '/register-proxy/admin',
      authController.getCheckMiddleware(adminRoles, [SYSTEM_ADMIN_UNIT]),
      proxy(`${global.config.register.server}:${global.config.register.port}`, {
        proxyReqOptDecorator: function (proxyReqOpts, req) {
          return new Promise(function (resolve, reject) {
            // Add authorization header.
            proxyReqOpts.headers['Authorization'] = global.config.register.token;

            // Add access info header.
            const accessInfo = {
              userId: req.authUserInfo?.userId || null,
              userName: req.authUserInfo?.name || null,
            };
            proxyReqOpts.headers['access-info'] = Buffer.from(JSON.stringify(accessInfo), 'utf8').toString('base64');

            // Delete token header.
            delete proxyReqOpts.headers['token'];

            // Check routes.
            if (['/export/', '/import/'].every((allowedPrefix) => !proxyReqOpts.path.startsWith(allowedPrefix))) {
              return reject('Not allowed.');
            }

            // Resolve.
            resolve(proxyReqOpts);
          });
        },
      }),
    );

    // Proxy.
    const { proxyList = [] } = this.config.proxy;
    for (const proxyItem of proxyList) {
      // Define proxy params.
      const { proxyUrl, destinationUrl, onlyForUnits = [], headers: proxyHeaders = [], proxyOptions = {} } = proxyItem;

      const defaultUnits = [SYSTEM_ADMIN_UNIT, READONLY_SYSTEM_ADMIN_UNIT, WORKFLOW_SYSTEM_ADMIN_UNIT, SECURITY_ADMIN_UNIT, SUPPORT_ADMIN_UNIT];
      const units = onlyForUnits?.length ? onlyForUnits : defaultUnits;

      // Init proxy.
      app.use(
        proxyUrl,
        authController.getCheckMiddleware(adminRoles, units),
        proxy(destinationUrl, {
          // Define request decorator.
          proxyReqOptDecorator: function (proxyReqOpts) {
            return new Promise(function (resolve) {
              // Set headers.
              for (const proxyHeader of proxyHeaders) {
                const { key: headerKey, value: headerValue } = proxyHeader;
                proxyReqOpts.headers[headerKey] = headerValue;
              }

              // Resolve decorated options.
              resolve(proxyReqOpts);
            });
          },
          ...proxyOptions, // Set additional `express-http-proxy` lib options.
        }),
      );
    }

    app.all('*', (req, res, _next) => {
      res.status(404).send({
        error: {
          message: 'Page not found.',
          code: 404,
        },
      });
    });

    // Error handler middleware.
    app.use((error, req, res, _next) => {
      res.status(error.status || 500).send({
        error: {
          message: error.message || 'Internal Server Error.',
          code: error.status || 500,
        },
      });
    });

    return {
      ping: pingController,
    };
  }

  /**
   * Listen.
   * @private
   * @param {object} app Express app.
   */
  async listen(app) {
    return new Promise((resolve) => {
      // Start server listening.
      const hostname = this.config.server.hostname;
      const port = this.config.server.port;
      this.server = app.listen(port, hostname, () => {
        log.save('server-listening-started', `Server listening started at "http://${hostname}:${port}".`);
        resolve();
      });
    });
  }
}

module.exports = RouterService;
