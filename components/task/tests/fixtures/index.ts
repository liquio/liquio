import { WORKFLOW_FIXTURES } from './workflow';
import { TASK_FIXTURES } from './task';
import { TASK_TEMPLATE_FIXTURES } from './task_template';
import { WORKFLOW_TEMPLATE_FIXTURES } from './workflow_template';
import { DOCUMENT_FIXTURES } from './document';
import { DOCUMENT_TEMPLATE_FIXTURES } from './document_template';
import { EVENT_FIXTURES } from './event';
import { EVENT_TEMPLATE_FIXTURES } from './event_template';
import { DOCUMENT_SIGNATURE_FIXTURES } from './document_signature';
import { USER_INBOX_FIXTURES } from './user_inbox';

export {
  WORKFLOW_FIXTURES,
  WORKFLOW_TEMPLATE_FIXTURES,
  TASK_FIXTURES,
  TASK_TEMPLATE_FIXTURES,
  DOCUMENT_FIXTURES,
  DOCUMENT_TEMPLATE_FIXTURES,
  DOCUMENT_SIGNATURE_FIXTURES,
  USER_INBOX_FIXTURES,
  EVENT_FIXTURES,
  EVENT_TEMPLATE_FIXTURES,
};

export async function prepareFixtures(app) {
  try {
    for (const workflowTemplate of WORKFLOW_TEMPLATE_FIXTURES) {
      await app.model('workflowTemplate').create(workflowTemplate);
    }
    for (const workflow of WORKFLOW_FIXTURES) {
      await app.model('workflow').create(workflow);
    }
    for (const documentTemplate of DOCUMENT_TEMPLATE_FIXTURES) {
      await app.model('documentTemplate').create(documentTemplate);
    }
    for (const document of DOCUMENT_FIXTURES) {
      await app.model('document').create(document);
    }
    for (const documentSignature of DOCUMENT_SIGNATURE_FIXTURES) {
      await app.model('documentSignature').create(documentSignature);
    }
    for (const taskTemplate of TASK_TEMPLATE_FIXTURES) {
      await app.model('taskTemplate').create(taskTemplate);
    }
    for (const task of TASK_FIXTURES) {
      await app.model('task').create(task);
    }
    for (const eventTemplate of EVENT_TEMPLATE_FIXTURES) {
      await app.model('eventTemplate').create(eventTemplate);
    }
    for (const event of EVENT_FIXTURES) {
      await app.model('event').create(event);
    }
    for (const userInbox of USER_INBOX_FIXTURES) {
      await app.model('userInbox').create(userInbox);
    }
  } catch (error) {
    const wrapped: any = new Error(`Unable to prepare fixtures: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }
}
