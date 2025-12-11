const { TestApp } = require('./test-app');

describe('EventBusiness - Clear type events', () => {
  /**
   * @type {TestApp}
   */
  let app;

  beforeAll(async () => {
    await TestApp.beforeAll();

    app = await TestApp.setup({});

    await app.init();
  });

  afterAll(async () => {
    await TestApp.afterAll(app);
  });

  afterEach(async () => {
    await TestApp.afterEach(app);
  });

  beforeEach(async () => {
    await TestApp.beforeEach(app);
  });

  describe('Clear type events', () => {
    it('should create and process clear event', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900001;
      const CLEAR_EVENT_TEMPLATE_ID = 900001001;
      const WORKFLOW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Clear Workflow',
        description: 'Workflow for testing clear event type',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create clear event template
      await app.model('eventTemplate').create({
        id: CLEAR_EVENT_TEMPLATE_ID,
        event_type_id: 8, // clear type = 8
        name: 'Clear Workflow Data',
        description: 'Event to clear workflow data',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create clear eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Clear Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger clear event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: CLEAR_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify clear event was created
      const [clearEvent] = await app.model('event').findAll({
        where: { event_template_id: CLEAR_EVENT_TEMPLATE_ID },
      });
      expect(clearEvent).toBeDefined();
      expect(clearEvent.event_type_id).toBe(8);
      expect(clearEvent.workflow_id).toBe(WORKFLOW_ID);
      expect(clearEvent.done).toBe(true);
      expect(clearEvent.cancellation_type_id).toBeNull();
    });

    it('should clear multiple workflows independently', async () => {
      // Unique IDs for test entities - first workflow
      const WORKFLOW_TEMPLATE_ID_1 = 900002;
      const CLEAR_EVENT_TEMPLATE_ID_1 = 900002001;
      const WORKFLOW_ID_1 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

      // Unique IDs - second workflow
      const WORKFLOW_TEMPLATE_ID_2 = 900003;
      const CLEAR_EVENT_TEMPLATE_ID_2 = 900003001;
      const WORKFLOW_ID_2 = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

      // Create first workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID_1,
        name: 'Clear Workflow 1',
        description: 'First workflow for testing clear',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate 1'));

      // Create second workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID_2,
        name: 'Clear Workflow 2',
        description: 'Second workflow for testing clear',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate 2'));

      // Create clear event template for first workflow
      await app.model('eventTemplate').create({
        id: CLEAR_EVENT_TEMPLATE_ID_1,
        event_type_id: 8, // clear type = 8
        name: 'Clear Workflow 1 Data',
        description: 'Event to clear first workflow',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create clear eventTemplate 1'));

      // Create clear event template for second workflow
      await app.model('eventTemplate').create({
        id: CLEAR_EVENT_TEMPLATE_ID_2,
        event_type_id: 8, // clear type = 8
        name: 'Clear Workflow 2 Data',
        description: 'Event to clear second workflow',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create clear eventTemplate 2'));

      // Create first workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID_1,
        workflow_template_id: WORKFLOW_TEMPLATE_ID_1,
        name: 'Clear Workflow Instance 1',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow 1'));

      // Create second workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID_2,
        workflow_template_id: WORKFLOW_TEMPLATE_ID_2,
        name: 'Clear Workflow Instance 2',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow 2'));

      // Trigger clear event for first workflow
      const result1 = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID_1,
        eventTemplateId: CLEAR_EVENT_TEMPLATE_ID_1,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID_1,
      });
      expect(result1).toBe(true);

      // Trigger clear event for second workflow
      const result2 = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID_2,
        eventTemplateId: CLEAR_EVENT_TEMPLATE_ID_2,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID_2,
      });
      expect(result2).toBe(true);

      // Verify both clear events were created
      const [clearEvent1] = await app.model('event').findAll({
        where: { event_template_id: CLEAR_EVENT_TEMPLATE_ID_1 },
      });
      expect(clearEvent1).toBeDefined();
      expect(clearEvent1.workflow_id).toBe(WORKFLOW_ID_1);
      expect(clearEvent1.done).toBe(true);

      const [clearEvent2] = await app.model('event').findAll({
        where: { event_template_id: CLEAR_EVENT_TEMPLATE_ID_2 },
      });
      expect(clearEvent2).toBeDefined();
      expect(clearEvent2.workflow_id).toBe(WORKFLOW_ID_2);
      expect(clearEvent2.done).toBe(true);
    });

    it('should return clear event with result', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900004;
      const CLEAR_EVENT_TEMPLATE_ID = 900004001;
      const WORKFLOW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Clear Result Workflow',
        description: 'Workflow for testing clear result',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create clear event template
      await app.model('eventTemplate').create({
        id: CLEAR_EVENT_TEMPLATE_ID,
        event_type_id: 8, // clear type = 8
        name: 'Clear with Result',
        description: 'Event to verify clear result',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create clear eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Clear Result Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger clear event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: CLEAR_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify clear event contains result
      const [clearEvent] = await app.model('event').findAll({
        where: { event_template_id: CLEAR_EVENT_TEMPLATE_ID },
      });
      expect(clearEvent).toBeDefined();
      expect(clearEvent.data).toBeDefined();
      expect(clearEvent.data.result).toBeDefined();

      // Verify clear event was processed and completed
      expect(clearEvent.done).toBe(true);
      expect(clearEvent.cancellation_type_id).toBeNull();

      // Verify event was created successfully
      expect(clearEvent.event_type_id).toBe(8);
      expect(clearEvent.workflow_id).toBe(WORKFLOW_ID);
    });

    it('should mark clear event as done with no pending status', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900005;
      const CLEAR_EVENT_TEMPLATE_ID = 900005001;
      const WORKFLOW_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Clear Done Workflow',
        description: 'Workflow for testing clear completion',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create clear event template
      await app.model('eventTemplate').create({
        id: CLEAR_EVENT_TEMPLATE_ID,
        event_type_id: 8, // clear type = 8
        name: 'Clear Done Event',
        description: 'Event to test clear done status',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create clear eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Clear Done Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger clear event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: CLEAR_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify clear event completed successfully
      const [clearEvent] = await app.model('event').findAll({
        where: { event_template_id: CLEAR_EVENT_TEMPLATE_ID },
      });

      expect(clearEvent).toBeDefined();
      expect(clearEvent.done).toBe(true);
      expect(clearEvent.due_date).toBeNull();
      expect(clearEvent.cancellation_type_id).toBeNull();
    });
  });
});
