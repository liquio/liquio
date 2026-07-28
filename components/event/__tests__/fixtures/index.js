const EVENT_TEMPLATE_FIXTURES = require('./event_templates');
const EVENT_FIXTURES = require('./events');
const WORKFLOW_TEMPLATE_FIXTURES = require('./workflow_templates');
const WORKFLOW_FIXTURES = require('./workflows');
const DOCUMENT_TEMPLATE_FIXTURES = require('./document_templates');

async function prepareFixtures(app) {
  const fixtureTypes = [
    { name: 'eventTemplate', fixtures: EVENT_TEMPLATE_FIXTURES },
    { name: 'workflowTemplate', fixtures: WORKFLOW_TEMPLATE_FIXTURES },
    { name: 'documentTemplate', fixtures: DOCUMENT_TEMPLATE_FIXTURES },
    { name: 'workflow', fixtures: WORKFLOW_FIXTURES },
    { name: 'event', fixtures: EVENT_FIXTURES },
  ];

  for (const { name, fixtures } of fixtureTypes) {
    for (let i = 0; i < fixtures.length; i++) {
      try {
        await app.model(name).create(fixtures[i]);
      } catch (error) {
        console.error(`Detailed error for ${name} fixture at index ${i}:`, error);
        throw new Error(`Unable to create ${name} fixture at index ${i}: ${error.message}`, { cause: error });
      }
    }
  }
}

module.exports = {
  EVENT_TEMPLATE_FIXTURES,
  EVENT_FIXTURES,
  WORKFLOW_TEMPLATE_FIXTURES,
  WORKFLOW_FIXTURES,
  DOCUMENT_TEMPLATE_FIXTURES,
  prepareFixtures,
};
