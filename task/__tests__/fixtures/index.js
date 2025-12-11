const { WORKFLOW_FIXTURES } = require('./workflow');
const { TASK_FIXTURES } = require('./task');
const { TASK_TEMPLATE_FIXTURES } = require('./task_template');
const { WORKFLOW_TEMPLATE_FIXTURES } = require('./workflow_template');
const { DOCUMENT_FIXTURES } = require('./document');
const { DOCUMENT_TEMPLATE_FIXTURES } = require('./document_template');
const { EVENT_FIXTURES } = require('./event');
const { EVENT_TEMPLATE_FIXTURES } = require('./event_template');
const { DOCUMENT_SIGNATURE_FIXTURES } = require('./document_signature');
const { USER_INBOX_FIXTURES } = require('./user_inbox');

async function prepareFixtures(app) {
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
    throw new Error(`Unable to prepare fixtures: ${error.message}`);
  }
}

module.exports = {
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
  prepareFixtures,
};
