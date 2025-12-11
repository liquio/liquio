const GROUPS = {
  ADMIN_API: 'admin-api',
  AUTH: 'auth',
  DOCUMENT: 'document',
  EXTERNAL_READER: 'external-reader',
  EXTERNAL: 'external',
  KYC: 'kyc',
  MESSAGE: 'message',
  MONITORING: 'monitoring',
  PAYMENT: 'payment',
  PUBLIC: 'public',
  REGISTER: 'register',
  TASK: 'task',
  UNIT: 'unit',
  USER: 'user',
  WORKFLOW: 'workflow',
  PROTECTED_FILES: 'protected-files',
};

// Define.
const routes = {
  'GET /test/ping': {
    groups: [GROUPS.PUBLIC, GROUPS.MONITORING, GROUPS.ADMIN_API],
    middlewares: [],
    validator: {
      name: 'test',
      method: 'ping',
    },
    controller: {
      name: 'ping',
      methodHandler: 'ping',
    },
  },
  'POST /test/ping': {
    groups: [GROUPS.PUBLIC, GROUPS.MONITORING],
    middlewares: [],
    validator: {
      name: 'test',
      method: 'ping',
    },
    controller: {
      name: 'ping',
      methodHandler: 'ping',
    },
  },
  'GET /test/ping/services': {
    groups: [GROUPS.PUBLIC, GROUPS.MONITORING, GROUPS.ADMIN_API],
    middlewares: [],
    validator: {
      name: 'test',
      method: 'pingServices',
    },
    controller: {
      name: 'ping',
      method: 'pingServices',
    },
  },
  'GET /test/ping/committed-documents/:document_template_id': {
    groups: [GROUPS.PUBLIC, GROUPS.MONITORING],
    middlewares: [],
    controller: {
      name: 'ping',
      method: 'pingCommittedDocumentsCount',
    },
  },
  'GET /healthz': {
    groups: [GROUPS.PUBLIC, GROUPS.MONITORING],
    middlewares: [],
    controller: {
      name: 'ping',
      method: 'healthz',
    },
  },
  'GET /modules': {
    groups: [GROUPS.PUBLIC],
    middlewares: [],
    controller: {
      name: 'module',
      method: 'getModules',
    },
  },
  'GET /monitor/system': {
    groups: [GROUPS.MONITORING],
    middlewares: [],
    controller: {
      name: 'monitor',
      method: 'system',
    },
    auth: ['monitoring'],
  },
  'POST /auth/login': {
    groups: [GROUPS.PUBLIC, GROUPS.AUTH],
    middlewares: [],
    controller: {
      name: 'auth',
      method: 'login',
    },
  },
  'GET /auth/me': {
    groups: [GROUPS.AUTH],
    middlewares: [],
    controller: {
      name: 'auth',
      method: 'me',
    },
    auth: ['individual'],
  },
  'POST /auth/bearer': {
    groups: [GROUPS.AUTH],
    middlewares: [],
    controller: {
      name: 'auth',
      method: 'getBearerToken',
    },
    basicAuth: true,
  },
  'GET /redirect/auth': {
    groups: [GROUPS.PUBLIC, GROUPS.AUTH],
    middlewares: [],
    controller: {
      name: 'redirect',
      method: 'auth',
    },
  },
  'GET /redirect/logout': {
    groups: [GROUPS.PUBLIC, GROUPS.AUTH],
    middlewares: [],
    controller: {
      name: 'redirect',
      method: 'logout',
    },
  },
  'GET /dictionaries': {
    groups: [GROUPS.PUBLIC],
    middlewares: [],
    controller: {
      name: 'dictionary',
      method: 'getAll',
    },
  },
  'GET /dictionaries/:name': {
    groups: [GROUPS.PUBLIC],
    middlewares: [],
    controller: {
      name: 'dictionary',
      method: 'getDictionaryByName',
    },
  },
  'GET /workflow-logs/:id': {
    groups: [GROUPS.WORKFLOW, GROUPS.ADMIN_API],
    middlewares: [],
    controller: {
      name: 'workflowLog',
      method: 'findById',
    },
    auth: ['individual'],
  },
  'GET /workflows': {
    groups: [GROUPS.WORKFLOW],
    middlewares: [],
    validator: {
      name: 'workflow',
      method: 'getAll',
    },
    controller: {
      name: 'workflow',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /workflows/elastic-filtered': {
    groups: [GROUPS.WORKFLOW, GROUPS.ADMIN_API],
    middlewares: [],
    controller: { name: 'workflow', method: 'getAllElasticFiltered' },
    validator: { name: 'workflow', method: 'getAllElasticFiltered' },
    basicAuth: true,
  },
  'GET /workflows/:id': {
    groups: [GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'workflow',
      method: 'findById',
    },
    auth: ['individual'],
  },
  'GET /tasks': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'getAll',
    },
    controller: {
      name: 'task',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /tasks/:id': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'findById',
    },
    controller: {
      name: 'task',
      method: 'findById',
    },
    auth: ['individual'],
  },
  'GET /tasks/:id/last': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'getLastByWorkflowId',
    },
    auth: ['individual'],
  },
  'GET /tasks/unread/count': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'getUnreadTasksCount',
    },
    controller: {
      name: 'task',
      method: 'getUnreadTasksCount',
    },
    auth: ['individual'],
  },
  'POST /tasks/get-user-performer-tasks': {
    groups: [GROUPS.TASK, GROUPS.EXTERNAL],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'getUserPerformerTasksFromOtherSystem',
    },
    basicAuth: true,
    protectedBasicAuth: true,
  },
  'POST /tasks': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'create',
    },
    auth: ['individual'],
  },
  'POST /tasks/by-other-system': {
    groups: [GROUPS.TASK, GROUPS.EXTERNAL],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'createByOtherSystem',
    },
    controller: {
      name: 'task',
      method: 'createByOtherSystem',
    },
    basicAuth: true,
  },
  'POST /tasks/:id/commit': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'commit',
    },
    auth: ['individual'],
  },
  'POST /tasks/:id/assign': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'assign',
    },
    auth: ['individual'],
  },
  'DELETE /tasks/expired-drafts': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'deleteExpiredDrafts',
    },
    auth: ['individual'],
  },
  'DELETE /tasks/:id': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'delete',
    },
    auth: ['individual'],
  },
  'DELETE /tasks/:id/permanent': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'deletePermanent',
    },
    auth: ['individual'],
  },
  'POST /tasks/:id/recover': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'recover',
    },
    auth: ['individual'],
  },
  'PUT /tasks/:id/signers': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'setSignerUsers',
    },
    auth: ['individual'],
  },
  'PUT /tasks/:id/performers': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'task',
      method: 'setPerformerUsers',
    },
    auth: ['individual'],
  },
  'PUT /tasks/:id/due-date': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'setDueDate',
    },
    controller: {
      name: 'task',
      method: 'setDueDate',
    },
    auth: ['individual'],
  },
  'PUT /tasks/:id/meta': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'updateTaskMetadata',
    },
    controller: {
      name: 'task',
      method: 'updateTaskMetadata',
    },
    auth: ['individual'],
  },
  'PUT /tasks/:id/signers/requests': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'calcSigners',
    },
    controller: {
      name: 'task',
      method: 'calcSigners',
    },
    auth: ['individual'],
  },
  'POST /tasks/:id/signers/apply': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'checkSignerAccess',
    },
    controller: {
      name: 'task',
      method: 'checkSignerAccess',
    },
    auth: ['individual'],
  },
  'GET /tasks/last/:workflowId/:taskTemplateId': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'getLastTaskId',
    },
    controller: {
      name: 'task',
      method: 'getLastTaskId',
    },
    auth: ['individual'],
  },
  'POST /tasks/statistics/get-by-unit-id': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'getStatisticsByUnitId',
    },
    controller: {
      name: 'task',
      method: 'getStatisticsByUnitId',
    },
    auth: ['individual'],
  },
  'POST /tasks/list/get-by-unit-id': {
    groups: [GROUPS.TASK],
    middlewares: [],
    validator: {
      name: 'task',
      method: 'getListByUnitId',
    },
    controller: {
      name: 'task',
      method: 'getListByUnitId',
    },
    auth: ['individual'],
  },
  'GET /documents/:id': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'findById',
    },
    auth: ['individual'],
  },
  'PUT /documents/:id': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'update',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/pdf': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'createPdf',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/large-pdf': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'createLargePdf',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/pdf': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getPdf',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/asic': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getAsic',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/attachments': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    validator: {
      name: 'document',
      method: 'addAttachment',
    },
    controller: {
      name: 'document',
      method: 'addAttachment',
    },
    auth: ['individual'],
    disableBodyParser: true,
  },
  'GET /documents/:id/attachments/zip': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getAttachmentsZip',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/attachments/:attachment_id': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getAttachment',
    },
    auth: ['individual'],
  },
  'DELETE /documents/:id/attachments/:attachment_id': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'deleteAttachment',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/sign': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getDataForSign',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/sign': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'sign',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/continue-sign': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'continueSign',
    },
    auth: ['individual'],
  },
  'DELETE /documents/:id/sign': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'deleteDocumentSigns',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/sign_p7s': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getDataForSignP7s',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/sign_p7s': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'signP7s',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/sign_additional_p7s': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getAdditionalDataForSignP7s',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/sign_additional_p7s': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'signAdditionalP7s',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/multisign/check': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'multisignCheck',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/singlesign/check': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'singlesignCheck',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/encrypt': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getDataToEncrypt',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/encrypt': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'saveEncryptedData',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/sign-rejection': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'setSignRejection',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/workflow_files': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getFilesToPreview',
    },
    auth: ['individual'],
  },
  'GET /documents/:id/workflow_files_direct': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getDirectFilesToPreview',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/calc': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'calcBackTriggered',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/prepare': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'prepare',
    },
    auth: ['individual'],
  },
  'POST /documents/:id/validate': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'validate',
    },
    auth: ['individual'],
  },
  'GET /files/:download_token': {
    groups: [GROUPS.FILE],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'getFileToPreview',
    },
    auth: ['individual'],
  },
  'POST /files': {
    groups: [GROUPS.FILE],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'uploadFile',
    },
    auth: ['individual'],
  },
  'POST /protected-files': {
    groups: [GROUPS.PROTECTED_FILES],
    middlewares: [],
    validator: {
      name: 'protectedFile',
      method: 'uploadProtectedFile',
    },
    controller: {
      name: 'protectedFile',
      method: 'uploadProtectedFile',
    },
    auth: ['individual'],
  },
  'GET /protected-files/keys/:key_id/records/:record_id': {
    groups: [GROUPS.PROTECTED_FILES],
    middlewares: [],
    validator: {
      name: 'protectedFile',
      method: 'open',
    },
    controller: {
      name: 'protectedFile',
      method: 'open',
    },
    auth: ['individual'],
  },
  'GET /workflow-template-categories': {
    groups: [GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'workflowTemplateCategory',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /workflow-templates': {
    groups: [GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'workflowTemplate',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /workflow-templates/:id': {
    groups: [GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'workflowTemplate',
      method: 'findById',
    },
    auth: ['individual'],
  },
  'GET /task-templates': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'taskTemplate',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /task-templates/:id': {
    groups: [GROUPS.TASK],
    middlewares: [],
    controller: {
      name: 'taskTemplate',
      method: 'findById',
    },
    auth: ['individual'],
  },
  'GET /document-templates': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'documentTemplate',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /document-templates/:id': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'documentTemplate',
      method: 'findById',
    },
    auth: ['individual'],
  },
  'GET /registers': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    controller: {
      name: 'register',
      method: 'getRegisters',
    },
    auth: ['individual'],
  },
  'GET /registers/specifics/addresses': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    controller: { name: 'register', method: 'getAddresses' },
    auth: ['individual'],
  },
  'GET /registers/keys': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    controller: {
      name: 'register',
      method: 'getKeys',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_id/search': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'search',
    },
    controller: {
      name: 'register',
      method: 'search',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_id/records': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getRecordsByKeyId',
    },
    controller: {
      name: 'register',
      method: 'getRecordsByKeyId',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_id/history': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getHistoryByKeyId',
    },
    controller: {
      name: 'register',
      method: 'getHistoryByKeyId',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_id/viewing_history': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getViewingHistoryByKeyId',
    },
    controller: {
      name: 'register',
      method: 'getViewingHistoryByKeyId',
    },
    auth: ['individual'],
  },
  'POST /registers/keys/:key_id/records/filter': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getFilteredRecordsByKeyId',
    },
    controller: {
      name: 'register',
      method: 'getFilteredRecordsByKeyId',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_ids/records_tree': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getRecordsTreeByKeyIds',
    },
    controller: {
      name: 'register',
      method: 'getRecordsTreeByKeyIds',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_id/records/:id': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'findRecordById',
    },
    controller: {
      name: 'register',
      method: 'findRecordById',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_id/records/:record_id/history': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getHistoryByRecordId',
    },
    controller: {
      name: 'register',
      method: 'getHistoryByRecordId',
    },
    auth: ['individual'],
  },
  'GET /registers/keys/:key_id/records/:record_id/viewing_history': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getViewingHistoryByRecordId',
    },
    controller: {
      name: 'register',
      method: 'getViewingHistoryByRecordId',
    },
    auth: ['individual'],
  },
  'POST /registers/keys/:key_id/records': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'createRecord',
    },
    controller: {
      name: 'register',
      method: 'createRecord',
    },
    auth: ['individual'],
  },
  'PUT /registers/keys/:key_id/records/:id': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'updateRecordById',
    },
    controller: {
      name: 'register',
      method: 'updateRecordById',
    },
    auth: ['individual'],
  },
  'DELETE /registers/keys/:key_id/records/:id': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'deleteRecordById',
    },
    controller: {
      name: 'register',
      method: 'deleteRecordById',
    },
    auth: ['individual'],
  },
  'DELETE /register/cache': {
    groups: [GROUPS.REGISTER, GROUPS.ADMIN_API],
    middlewares: [],
    controller: {
      name: 'register',
      method: 'deleteCache',
    },
    basicAuth: true,
  },
  'POST /registers/rollback/start': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'startRollback',
    },
    controller: {
      name: 'register',
      method: 'startRollback',
    },
    auth: ['individual'],
  },
  'GET /registers/rollback/:rollbackId/status': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'getRollbackStatusWithDetails',
    },
    controller: {
      name: 'register',
      method: 'getRollbackStatusWithDetails',
    },
    auth: ['individual'],
  },
  'POST /registers/rollback/record': {
    groups: [GROUPS.REGISTER],
    middlewares: [],
    validator: {
      name: 'register',
      method: 'rollbackRecord',
    },
    controller: {
      name: 'register',
      method: 'rollbackRecord',
    },
    auth: ['individual'],
  },
  'GET /important-messages': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'message',
      method: 'getImportantMessages',
    },
    auth: ['individual'],
  },
  'PUT /important-messages/:id/hide': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'message',
      method: 'hideImportantMessage',
    },
    auth: ['individual'],
  },
  'GET /messages': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'message',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'PUT /messages/state': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'message',
      method: 'setMessageStateIsRead',
    },
    auth: ['individual'],
  },
  'PUT /messages/:id/decrypt': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'message',
      method: 'decrypt',
    },
    auth: ['individual'],
  },
  'GET /messages/count-unread': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'message',
      method: 'getCountUnreadMessages',
    },
    auth: ['individual'],
  },
  'GET /user-inboxes': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    validator: {
      name: 'userInbox',
      method: 'getAll',
    },
    controller: {
      name: 'userInbox',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /user-inboxes/unread/count': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'userInbox',
      method: 'getUnreadCount',
    },
    auth: ['individual'],
  },
  'PUT /user-inboxes/:id/is-read': {
    groups: [GROUPS.MESSAGE],
    middlewares: [],
    controller: {
      name: 'userInbox',
      method: 'setIsRead',
    },
    auth: ['individual'],
  },
  'POST /users/search': {
    groups: [GROUPS.USER],
    middlewares: [],
    controller: {
      name: 'user',
      method: 'search',
    },
    auth: ['admin'],
  },
  'GET /units': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: {
      name: 'unit',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /units/:id': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: {
      name: 'unit',
      method: 'findById',
    },
    basicAuth: true,
  },
  'GET /units/:id/as-head': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: {
      name: 'unit',
      method: 'findByIdAsHead',
    },
    auth: ['individual'],
  },
  'POST /units/participants-as-head': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: {
      name: 'unit',
      method: 'getUnitParticipantsAsHead',
    },
    basicAuth: true,
    protectedBasicAuth: true,
  },
  'POST /units/:id/requested-members': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: {
      name: 'unit',
      method: 'addRequestedMember',
    },
    auth: ['individual'],
  },
  'DELETE /units/:id/members': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: {
      name: 'unit',
      method: 'removeMember',
    },
    auth: ['individual'],
  },
  'GET /unit-access': {
    groups: [GROUPS.UNIT, GROUPS.ADMIN_API],
    middlewares: [],
    controller: {
      name: 'unitAccess',
      method: 'getAll',
    },
    basicAuth: true,
  },
  'GET /unit-access/:id': {
    groups: [GROUPS.UNIT, GROUPS.ADMIN_API],
    middlewares: [],
    controller: {
      name: 'unitAccess',
      method: 'findById',
    },
    basicAuth: true,
  },
  'POST /unit-access': {
    groups: [GROUPS.UNIT, GROUPS.ADMIN_API],
    middlewares: [],
    controller: {
      name: 'unitAccess',
      method: 'create',
    },
    basicAuth: true,
  },
  'PUT /unit-access/:id': {
    groups: [GROUPS.UNIT, GROUPS.ADMIN_API],
    middlewares: [],
    controller: {
      name: 'unitAccess',
      method: 'update',
    },
    basicAuth: true,
  },
  'DELETE /unit-access/:id': {
    groups: [GROUPS.UNIT, GROUPS.ADMIN_API],
    middlewares: [],
    controller: {
      name: 'unitAccess',
      method: 'delete',
    },
    basicAuth: true,
  },
  'GET /users/two_factor_auth': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: { name: 'user', method: 'getTwoFactorAuth' },
    auth: ['individual'],
  },
  'POST /users/two_factor_auth': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'setTwoFactorAuth' },
    controller: { name: 'user', method: 'setTwoFactorAuth' },
    auth: ['individual'],
  },
  'PUT /users': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: { name: 'user', method: 'updateInfo' },
    auth: ['individual'],
  },
  'GET /users/phone/exist': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    controller: { name: 'user', method: 'isPhoneExists' },
    auth: ['individual'],
  },
  'GET /users/phone/already_used': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'isPhoneAlreadyUsed' },
    controller: { name: 'user', method: 'isPhoneAlreadyUsed' },
    auth: ['individual'],
  },
  'POST /users/phone/send_sms_for_phone_verification': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'sendSmsForPhoneVerification' },
    controller: { name: 'user', method: 'sendSmsForPhoneVerification' },
    auth: ['individual'],
  },
  'POST /users/phone/verify': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'verifyPhone' },
    controller: { name: 'user', method: 'verifyPhone' },
    auth: ['individual'],
  },
  'PUT /users/email/change': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'changeEmail' },
    controller: { name: 'user', method: 'changeEmail' },
    auth: ['individual'],
  },
  'POST /users/email/confirm': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'confirmChangeEmail' },
    controller: { name: 'user', method: 'confirmChangeEmail' },
    auth: ['individual'],
  },
  'POST /users/email/check_email_confirmation_code': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'checkEmailConfirmationCode' },
    controller: { name: 'user', method: 'checkEmailConfirmationCode' },
    auth: ['individual'],
  },
  'POST /users/email/check': {
    groups: [GROUPS.UNIT],
    middlewares: [],
    validator: { name: 'user', method: 'checkEmail' },
    controller: { name: 'user', method: 'checkEmail' },
    auth: ['individual'],
  },
  'GET /external_services/documents/:id': {
    groups: [GROUPS.EXTERNAL, GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'document',
      method: 'findByIdWithBasicAuth',
    },
    basicAuth: true,
  },
  'POST /external-services/workflow/:workflow_id/task-template/:task_template_id': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'updateDocumentAndCommitRest',
    },
    basicAuth: true,
  },
  'POST /external-services/workflow/soap': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'updateDocumentAndCommitSoap',
    },
    xmlBodyParser: true,
  },
  'POST /external-services/ping-soap': {
    groups: [GROUPS.EXTERNAL, GROUPS.MONITORING],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'pingSOAP',
    },
    rawBody: true,
  },
  'GET /external-services/ping-rest': {
    groups: [GROUPS.EXTERNAL, GROUPS.MONITORING],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'pingREST',
    },
    rawBody: true,
  },
  'PUT /external_services/workflow/:workflow_id/task_template/:task_template_id': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'updateDocument',
    },
    basicAuth: true,
  },
  'POST /external_services/workflow': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'createTask',
    },
    basicAuth: true,
  },
  'POST /external_services/attachments/:id': {
    groups: [GROUPS.EXTERNAL, GROUPS.DOCUMENT],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'addAttachment',
    },
    basicAuth: true,
    disableBodyParser: true,
  },
  'POST /external_services/workflow/:workflow_id/task_template/:task_template_id/calc_payment': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'calculatePaymentData',
    },
    basicAuth: true,
  },
  'POST /external_services/workflow/:workflow_id/task_template/:task_template_id/commit': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'commitDocument',
    },
    basicAuth: true,
  },
  'GET /external_services/workflow/:workflow_id/task_template/:task_template_id/document': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'externalServices',
      method: 'getDocument',
    },
    basicAuth: true,
  },
  'GET /external_services/workflow-logs/workflows-by-updated-at': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    validator: {
      name: 'workflowLog',
      method: 'getWorkflowsByUpdatedAt',
    },
    controller: {
      name: 'workflowLog',
      method: 'getWorkflowsByUpdatedAt',
    },
    basicAuth: true,
  },
  'GET /external_services/workflow-logs/workflows': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    validator: {
      name: 'workflowLog',
      method: 'getWorkflows',
    },
    controller: {
      name: 'workflowLog',
      method: 'getWorkflows',
    },
    basicAuth: true,
  },
  'GET /external_services/workflow-logs/:id': {
    groups: [GROUPS.EXTERNAL, GROUPS.WORKFLOW],
    middlewares: [],
    controller: {
      name: 'workflowLog',
      method: 'findById',
    },
    basicAuth: true,
  },
  'POST /payment/:customer/confirm_code': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    validator: { name: 'payment', method: 'confirmBySmsCode' },
    controller: { name: 'payment', method: 'confirmBySmsCode' },
    auth: ['individual'],
  },
  'POST /documents/:id/calc_payment': {
    groups: [GROUPS.PAYMENT, GROUPS.DOCUMENT],
    middlewares: [],
    validator: { name: 'payment', method: 'calculatePaymentData' },
    controller: { name: 'payment', method: 'calculatePaymentData' },
    auth: ['individual'],
  },
  'POST /documents/:id/external-reader/check': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    validator: { name: 'document', method: 'checkAndSaveDataFromExternalReader' },
    controller: { name: 'document', method: 'checkAndSaveDataFromExternalReader' },
    auth: ['individual'],
  },
  'POST /documents/:id/external-reader/check/async': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    validator: { name: 'document', method: 'checkAndSaveDataFromExternalReaderAsync' },
    controller: { name: 'document', method: 'checkAndSaveDataFromExternalReaderAsync' },
    auth: ['individual'],
  },
  'PUT /documents/:id/verified-user-info': {
    groups: [GROUPS.DOCUMENT],
    middlewares: [],
    validator: { name: 'document', method: 'updateVerifiedUserInfo' },
    controller: { name: 'document', method: 'updateVerifiedUserInfo' },
    auth: ['individual'],
  },
  'GET /payment/:customer/:status': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    controller: { name: 'payment', method: 'handleStatus' },
  },
  'POST /payment/:customer/:status': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    controller: { name: 'payment', method: 'handleStatus' },
    disableBodyParser: true,
  },
  'POST /payment/cancelOrder': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    controller: { name: 'payment', method: 'cancelOrder' },
    basicAuth: true,
  },
  'POST /payment/:customer': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    controller: { name: 'payment', method: 'handleStatus' },
    disableBodyParser: true,
  },
  'GET /payment/receipt': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    validator: { name: 'payment', method: 'getReceipt' },
    controller: { name: 'payment', method: 'getReceipt' },
    auth: ['individual'],
  },
  'POST /kyc/:provider': {
    groups: [GROUPS.KYC],
    middlewares: [],
    controller: { name: 'kyc', method: 'createSession' },
    auth: ['individual'],
  },
  'PUT /kyc/:provider/:id': {
    groups: [GROUPS.KYC],
    middlewares: [],
    controller: { name: 'kyc', method: 'updateSession' },
    auth: ['individual'],
  },
  'GET /kyc/:provider/:id': {
    groups: [GROUPS.KYC],
    middlewares: [],
    controller: { name: 'kyc', method: 'getSession' },
    auth: ['individual'],
  },
  'POST /validate_apple_pay_session': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    validator: { name: 'payment', method: 'validateApplePaySession' },
    controller: { name: 'payment', method: 'validateApplePaySession' },
    auth: ['individual'],
  },
  'GET /payment/withdrawal_status': {
    groups: [GROUPS.PAYMENT],
    middlewares: [],
    validator: { name: 'payment', method: 'getReceipt' },
    controller: { name: 'payment', method: 'getWithdrawalStatus' },
    auth: ['individual'],
  },
  'GET /external_reader/mocks-keys-by-user': {
    groups: [GROUPS.EXTERNAL_READER],
    middlewares: [],
    validator: { name: 'externalReader', method: 'getMocksKeysByUser' },
    controller: { name: 'externalReader', method: 'getMocksKeysByUser' },
    auth: ['individual'],
  },
  'GET /external_reader/captcha/providers/list': {
    middlewares: [],
    controller: { name: 'externalReader', method: 'getCaptchProviders' },
  },
  'GET /external_reader/captcha/:service/:method': {
    middlewares: [],
    controller: { name: 'externalReader', method: 'getCaptchaChallenge' },
  },
  'POST /external_reader': {
    groups: [GROUPS.EXTERNAL_READER],
    middlewares: [],
    validator: { name: 'externalReader', method: 'getData' },
    controller: { name: 'externalReader', method: 'getData' },
    auth: ['individual'],
  },
  'POST /external_reader/async': {
    groups: [GROUPS.EXTERNAL_READER],
    middlewares: [],
    validator: { name: 'externalReader', method: 'getDataAsync' },
    controller: { name: 'externalReader', method: 'getDataAsync' },
    auth: ['individual'],
  },
  'DELETE /external_reader/cache': {
    groups: [GROUPS.EXTERNAL_READER],
    middlewares: [],
    controller: { name: 'externalReader', method: 'deleteCache' },
    auth: ['individual'],
  },
  'GET /ui-filters': {
    middlewares: [],
    controller: {
      name: 'uiFilter',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /custom-interfaces': {
    middlewares: [],
    validator: { name: 'customInterface', method: 'getAll' },
    controller: {
      name: 'customInterface',
      method: 'getAll',
    },
    auth: ['individual'],
  },
  // outdated. see `favorites` implimentation in `bpm-workflow-handler service`
  'GET /favorites/:entity_type': {
    groups: [GROUPS.USER],
    middlewares: [],
    validator: { name: 'favorites', method: 'default' },
    controller: {
      name: 'favorites',
      methodHandler: 'getAll',
    },
    auth: ['individual'],
  },
  'GET /favorites/:entity_type/:entity_id': {
    groups: [GROUPS.USER],
    middlewares: [],
    validator: { name: 'favorites', method: 'default' },
    controller: {
      name: 'favorites',
      methodHandler: 'getOne',
    },
    auth: ['individual'],
  },
  'POST /favorites/:entity_type/:entity_id': {
    groups: [GROUPS.USER],
    middlewares: [],
    validator: { name: 'favorites', method: 'default' },
    controller: {
      name: 'favorites',
      methodHandler: 'add',
    },
    auth: ['individual'],
  },
  'DELETE /favorites/:entity_type/:entity_id': {
    groups: [GROUPS.USER],
    middlewares: [],
    validator: { name: 'favorites', method: 'default' },
    controller: {
      name: 'favorites',
      methodHandler: 'remove',
    },
    auth: ['individual'],
  },
  'GET /localization-languages': {
    middlewares: [],
    validator: { name: 'localizationLanguage', method: 'getAll' },
    controller: { name: 'localizationLanguage', method: 'getAll' },
    auth: ['individual'],
  },
  'GET /localization-texts': {
    middlewares: [],
    validator: { name: 'localizationText', method: 'getAll' },
    controller: { name: 'localizationText', method: 'getAll' },
    auth: ['individual'],
  },
};

module.exports = {
  GROUPS,
  routes,
};
