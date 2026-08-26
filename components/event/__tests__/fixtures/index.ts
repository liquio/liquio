import { EVENT_TEMPLATE_FIXTURES } from './event_templates';
import { EVENT_FIXTURES } from './events';
import { WORKFLOW_TEMPLATE_FIXTURES } from './workflow_templates';
import { WORKFLOW_FIXTURES } from './workflows';
import { DOCUMENT_TEMPLATE_FIXTURES } from './document_templates';

export async function prepareFixtures(app: any): Promise<void> {
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
      } catch (error: any) {
        console.error(`Detailed error for ${name} fixture at index ${i}:`, error);
        const wrapped = new Error(`Unable to create ${name} fixture at index ${i}: ${error.message}`);
        (wrapped as any).cause = error;
        throw wrapped;
      }
    }
  }
}

export {
  EVENT_TEMPLATE_FIXTURES,
  EVENT_FIXTURES,
  WORKFLOW_TEMPLATE_FIXTURES,
  WORKFLOW_FIXTURES,
  DOCUMENT_TEMPLATE_FIXTURES,
};
