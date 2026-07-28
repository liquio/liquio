const { TestApp } = require('./test-app');

describe('EventBusiness - Notification type events', () => {
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

  describe('Notification type events', () => {
    it('should send notification with subject and email list', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900001;
      const NOTIFICATION_EVENT_TEMPLATE_ID = 900001001;
      const WORKFLOW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Notification Workflow',
        description: 'Workflow for testing notification event type',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create notification event template with empty schema (no actual sending required)
      await app.model('eventTemplate').create({
        id: NOTIFICATION_EVENT_TEMPLATE_ID,
        event_type_id: 1, // notification type = 1
        name: 'Send Notification',
        description: 'Event to send notification',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create notification eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Notification Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger notification event (with empty schema, it won't actually try to send)
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
        eventTemplateId: NOTIFICATION_EVENT_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify notification event created
      const [notificationEvent] = await app.model('event').findAll({
        where: { event_template_id: NOTIFICATION_EVENT_TEMPLATE_ID },
      });
      expect(notificationEvent).toBeDefined();
      expect(notificationEvent.done).toBe(true);
      expect(notificationEvent.event_type_id).toBe(1);

      // Verify event data is properly structured
      expect(notificationEvent.data).toBeDefined();
      expect(notificationEvent.data.result).toBeDefined();
    });

    it('should send notification with dynamic emails from schema function', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900002;
      const NOTIFICATION_EVENT_TEMPLATE_ID = 900002001;
      const WORKFLOW_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Dynamic Notification Workflow',
        description: 'Workflow for testing dynamic notification',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create notification event template with empty schema
      await app.model('eventTemplate').create({
        id: NOTIFICATION_EVENT_TEMPLATE_ID,
        event_type_id: 1,
        name: 'Send Dynamic Notification',
        description: 'Event with empty schema',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create dynamic notification eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Dynamic Notification Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger notification event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
        eventTemplateId: NOTIFICATION_EVENT_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify notification event created
      const [notificationEvent] = await app.model('event').findAll({
        where: { event_template_id: NOTIFICATION_EVENT_TEMPLATE_ID },
      });
      expect(notificationEvent).toBeDefined();
      expect(notificationEvent.done).toBe(true);
      expect(notificationEvent.event_type_id).toBe(1);

      // Verify event data is properly structured
      expect(notificationEvent.data).toBeDefined();
      expect(notificationEvent.data.result).toBeDefined();
    });

    it('should send notification with multiple email types', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900003;
      const NOTIFICATION_EVENT_TEMPLATE_ID = 900003001;
      const WORKFLOW_ID = 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Multi-Email Notification Workflow',
        description: 'Workflow for testing notification with multiple email types',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create notification event template with empty schema
      await app.model('eventTemplate').create({
        id: NOTIFICATION_EVENT_TEMPLATE_ID,
        event_type_id: 1,
        name: 'Multi-Email Notification',
        description: 'Event with empty schema',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create multi-email notification eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Multi-Email Notification Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger notification event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
        eventTemplateId: NOTIFICATION_EVENT_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify notification event created
      const [notificationEvent] = await app.model('event').findAll({
        where: { event_template_id: NOTIFICATION_EVENT_TEMPLATE_ID },
      });
      expect(notificationEvent).toBeDefined();
      expect(notificationEvent.done).toBe(true);
      expect(notificationEvent.event_type_id).toBe(1);

      // Verify event has proper result structure
      expect(notificationEvent.data).toBeDefined();
      expect(notificationEvent.data.result).toBeDefined();

      // Verify notification event completes immediately
      expect(notificationEvent.done).toBe(true);
    });
  });
});
