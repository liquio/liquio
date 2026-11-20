import { WORKFLOW_FIXTURES } from './workflow';
import { WORKFLOW_TEMPLATE_FIXTURES } from './workflow_template';
import { BASE_UNIT_FIXTURES, UNIT_FIXTURES } from './unit';
import type { TestApp } from '../test-app';

export async function prepareFixtures(app: TestApp) {
  try {
    // Update existing units with our test data (units are already created by migrations)
    for (const unit of BASE_UNIT_FIXTURES) {
      await app.model('unit').update(unit, { where: { id: unit.id } });
    }

    // Create any additional units if needed
    for (const unit of UNIT_FIXTURES) {
      await app.model('unit').create(unit);
    }

    for (const workflowTemplate of WORKFLOW_TEMPLATE_FIXTURES) {
      await app.model('workflowTemplate').create(workflowTemplate);
    }
    for (const workflow of WORKFLOW_FIXTURES) {
      await app.model('workflow').create(workflow);
    }
  } catch (error) {
    throw new Error(`Unable to prepare fixtures: ${error.message}`);
  }
}

export { WORKFLOW_FIXTURES, WORKFLOW_TEMPLATE_FIXTURES, BASE_UNIT_FIXTURES, UNIT_FIXTURES };
