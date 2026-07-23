
import { Business } from './business';
import Sandbox from '../lib/sandbox';

/**
 * User inbox business.
 */
export class UserInboxBusiness extends Business {
  private static singleton: UserInboxBusiness;

  sandbox: any;

  /**
   * Constructor.
   * @param {object} config Config object.
   */
  constructor(config) {
    // Define singleton.
    if (!UserInboxBusiness.singleton) {
      super(config);
      this.sandbox = new Sandbox({});
      UserInboxBusiness.singleton = this;
    }
    return UserInboxBusiness.singleton;
  }

  /**
   * Send to inboxes if need it.
   * @param {TaskEntity} finishedTask Finished task.
   * @returns {Promise<undefined>} Promise.
   */
  async sendToInboxesIfNeedIt(finishedTask) {
    // Define params.
    const { workflowId, id: taskId, finished: taskIsFinished, documentId } = finishedTask || {};

    // Check task is finished.
    if (!taskIsFinished) {
      global.log.save('save-to-inboxes|task-not-finished', { taskId, taskIsFinished, documentId });
      return;
    }

    // Check document ID.
    if (!documentId) {
      global.log.save('save-to-inboxes|document-id-not-defined', { taskId, documentId });
      return;
    }

    // Check document.
    const document = await global.models.document.findById(documentId);
    if (!document) {
      global.log.save('save-to-inboxes|document-not-found', { taskId, documentId });
      return;
    }

    if (!document.fileId) {
      global.log.save('save-to-inboxes|document-has-no-file', { taskId, documentId });
      return;
    }

    // Get document template.
    const { documentTemplateId, number: documentNumber } = document;
    const documentTemplate = await global.models.documentTemplate.findById(documentTemplateId);

    // Define users list.
    const { accessJsonSchema: { inboxes: inboxesJsonSchema }, name: documentTemplateName, jsonSchema: { fileName } } = documentTemplate;
    const usersList = await this.getUsersListForInboxes(inboxesJsonSchema, workflowId);

    const preparedFileNameSchema = this.sandbox.evalWithArgs(
      fileName,
      [document.data],
      {
        checkArrow: true,
        meta: { fn: 'documentTemplate.jsonSchemafileName', documentId, workflowId },
      },
    );
    const preparedFileName = Array.isArray(preparedFileNameSchema) ? preparedFileNameSchema[0] : preparedFileNameSchema;

    // Save for all users.
    for (const user of usersList) {
      (global.models.userInbox.create as any)({
        userId: user,
        documentId,
        name: preparedFileName || documentTemplateName,
        number: documentNumber
      });
    }
  }

  /**
   * Get users list for inboxes.
   * @param {{workflowCreator?: true, users?: string}} inboxesJsonSchema Inboxes JSON schema. Sample: { users: '(documents) => { const user = documents.find(item => item.documentTemplateId === 4).createdBy; return [ user ]; }' }.
   * @param {string} workflowId Workflow ID.
   * @returns {Promise<string[]>}
   */
  async getUsersListForInboxes(inboxesJsonSchema, workflowId) {
    // Define params.
    const { workflowCreator, users: usersStringifiedFunction } = inboxesJsonSchema;

    let users = [];

    // Handle if workflow creator.
    if (workflowCreator) {
      const workflow = await global.models.workflow.findById(workflowId);
      const { createdBy: workflowCreatedBy } = workflow;
      global.log.save('save-to-inboxes|users-definition-by-workflow-created-by|defined', { workflowCreatedBy, inboxesJsonSchema, workflowId });
      users.push(workflowCreatedBy);
    }

    // Handle function.
    if (usersStringifiedFunction) {
      // Get workflow documents.
      const workflowDocuments = global.models.task.getDocumentsByWorkflowId(workflowId);

      // Define and return users list.
      try {
        const usersFunctionResponse = this.sandbox.evalWithArgs(
          usersStringifiedFunction,
          [workflowDocuments],
          { meta: { fn: 'inboxesJsonSchema.users', workflowId } },
        );
        const usersAfterEvalFunction = Array.isArray(usersFunctionResponse) && usersFunctionResponse.every(v => typeof v === 'string') ?
          usersFunctionResponse : (typeof usersFunctionResponse === 'string' ? [usersFunctionResponse] : []);
        global.log.save('save-to-inboxes|users-definition-by-function|defined', { users, usersFunctionResponse, inboxesJsonSchema, workflowId });

        users = users.concat(usersAfterEvalFunction);
      } catch (error) {
        global.log.save('save-to-inboxes|users-definition-by-function|error', { inboxesJsonSchema, workflowId, error: error && error.message }, 'error');
      }
    }

    return [...new Set(users)];
  }
}

