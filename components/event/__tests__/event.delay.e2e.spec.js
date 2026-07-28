const { TestApp } = require('./test-app');

describe('EventBusiness - Delay type events', () => {
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

  describe('Delay type events', () => {
    it('should schedule delay event with static delay string', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 700001;
      const DELAY_EVENT_TEMPLATE_ID = 700001001;
      const DOCUMENT_TEMPLATE_ID = 700001001;
      const WORKFLOW_ID = 'a7b8c9d0-e1f2-4a5b-8c9d-0e1f2a3b4c5d';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Static Delay Workflow',
        description: 'Workflow for testing static delay event type',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      });

      // Create delay event template with static delay string
      await app.model('eventTemplate').create({
        id: DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2, // 'delay' type
        name: 'Static Delay Event',
        description: 'Event to schedule static delay',
        json_schema: JSON.stringify({
          delay: '2h', // Static delay: 2 hours
        }),
        html_template: '',
      });

      // Create document template
      await app.model('documentTemplate').create({
        id: DOCUMENT_TEMPLATE_ID,
        name: 'Delay Test Document',
        json_schema: '{"title":"Delay Test","pdfRequired":false}',
        html_template: '<!DOCTYPE html><html><body>Delay Test</body></html>',
      });

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Static Delay Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      });

      // Trigger delay event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: DELAY_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify delay event created event record
      const [event] = await app.model('event').findAll({
        where: { event_template_id: DELAY_EVENT_TEMPLATE_ID },
      });

      expect(event).toBeDefined();
      expect(event).toMatchObject({
        event_template_id: DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2,
        workflow_id: WORKFLOW_ID,
        created_by: 'system',
        updated_by: 'system',
        done: false, // Delay events should not be marked as done
      });

      // Verify dueDate is set correctly
      expect(event.due_date).toBeDefined();
      expect(event.due_date).not.toBeNull();

      // Verify data contains the dueDate (stored as formatted string in data)
      expect(event.data).toMatchObject({
        result: {},
        dueDate: expect.any(String),
      });
      // Verify due_date is stored in the correct format (YYYY-MM-DD HH:mm:ss)
      expect(event.data.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/);
    });

    it('should schedule delay event with dynamic delay function', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 700002;
      const DELAY_EVENT_TEMPLATE_ID = 700002001;
      const DOCUMENT_TEMPLATE_ID = 700002001;
      const WORKFLOW_ID = 'b8c9d0e1-f2a5-4b8c-9d0e-1f2a3b4c5d6e';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Dynamic Delay Workflow',
        description: 'Workflow for testing dynamic delay event type',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      });

      // Create delay event template with dynamic delay function
      await app.model('eventTemplate').create({
        id: DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2, // 'delay' type
        name: 'Dynamic Delay Event',
        description: 'Event to schedule dynamic delay',
        json_schema: JSON.stringify({
          delay: '() => \'1d\'', // Dynamic delay function: 1 day
        }),
        html_template: '',
      });

      // Create document template
      await app.model('documentTemplate').create({
        id: DOCUMENT_TEMPLATE_ID,
        name: 'Dynamic Delay Document',
        json_schema: '{"title":"Dynamic Delay Test","pdfRequired":false}',
        html_template: '<!DOCTYPE html><html><body>Dynamic Delay Test</body></html>',
      });

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Dynamic Delay Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      });

      // Trigger delay event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: DELAY_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify delay event created event record
      const [event] = await app.model('event').findAll({
        where: { event_template_id: DELAY_EVENT_TEMPLATE_ID },
      });

      expect(event).toBeDefined();
      expect(event).toMatchObject({
        event_template_id: DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2,
        workflow_id: WORKFLOW_ID,
        created_by: 'system',
        updated_by: 'system',
        done: false, // Delay events should not be marked as done
      });

      // Verify dueDate is set correctly
      expect(event.due_date).toBeDefined();
      expect(event.due_date).not.toBeNull();

      // Verify data contains the dueDate (stored as formatted string in data)
      expect(event.data).toMatchObject({
        result: {},
        dueDate: expect.any(String),
      });
      // Verify due_date is stored in the correct format (YYYY-MM-DD HH:mm:ss)
      expect(event.data.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/);
    });

    it('should handle multiple consecutive delay events', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 700003;
      const FIRST_DELAY_EVENT_TEMPLATE_ID = 700003001;
      const SECOND_DELAY_EVENT_TEMPLATE_ID = 700003002;
      const DOCUMENT_TEMPLATE_ID = 700003001;
      const WORKFLOW_ID = 'c9d0e1f2-a5b8-4c9d-0e1f-2a3b4c5d6e7f';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Multiple Delay Workflow',
        description: 'Workflow for testing multiple delay events',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      });

      // Create first delay event template
      await app.model('eventTemplate').create({
        id: FIRST_DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2, // 'delay' type
        name: 'First Delay Event',
        description: 'First delay event in sequence',
        json_schema: JSON.stringify({
          delay: '1h', // 1 hour
        }),
        html_template: '',
      });

      // Create second delay event template
      await app.model('eventTemplate').create({
        id: SECOND_DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2, // 'delay' type
        name: 'Second Delay Event',
        description: 'Second delay event in sequence',
        json_schema: JSON.stringify({
          delay: '2h', // 2 hours
        }),
        html_template: '',
      });

      // Create document template
      await app.model('documentTemplate').create({
        id: DOCUMENT_TEMPLATE_ID,
        name: 'Multiple Delay Document',
        json_schema: '{"title":"Multiple Delay Test","pdfRequired":false}',
        html_template: '<!DOCTYPE html><html><body>Multiple Delay Test</body></html>',
      });

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Multiple Delay Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      });

      // Trigger first delay event
      const firstResult = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: FIRST_DELAY_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(firstResult).toBe(true);

      // Trigger second delay event
      const secondResult = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: SECOND_DELAY_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(secondResult).toBe(true);

      // Verify both delay events were created
      const events = await app.model('event').findAll({
        where: { workflow_id: WORKFLOW_ID },
        order: [['created_at', 'ASC']],
      });

      expect(events.length).toBe(2);

      // Verify first event
      expect(events[0]).toMatchObject({
        event_template_id: FIRST_DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2,
        workflow_id: WORKFLOW_ID,
        done: false,
      });
      expect(events[0].due_date).toBeDefined();

      // Verify second event
      expect(events[1]).toMatchObject({
        event_template_id: SECOND_DELAY_EVENT_TEMPLATE_ID,
        event_type_id: 2,
        workflow_id: WORKFLOW_ID,
        done: false,
      });
      expect(events[1].due_date).toBeDefined();

      // Verify second event's due date is later than first (due to longer delay)
      expect(new Date(events[1].due_date).getTime()).toBeGreaterThan(new Date(events[0].due_date).getTime());
    });
  });
});
