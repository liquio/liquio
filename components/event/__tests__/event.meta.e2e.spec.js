const { TestApp } = require('./test-app');

describe('EventBusiness - Meta type events', () => {
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

  describe('Meta type events', () => {
    it('should create and process meta update event', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900001;
      const TASK_TEMPLATE_ID = 900001;
      const META_EVENT_TEMPLATE_ID = 900001001;
      const WORKFLOW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const TASK_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Workflow',
        description: 'Workflow for testing meta event type',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create meta event template with metaFunction that updates meta
      await app.model('eventTemplate').create({
        id: META_EVENT_TEMPLATE_ID,
        event_type_id: 8, // meta type = 8
        name: 'Update Meta Event',
        description: 'Event to update task meta',
        json_schema: JSON.stringify({
          eventMeta: 'update',
          taskId: `() => { return '${TASK_ID}'; }`,
          metaFunction: '() => { return { department: \'Engineering\', status: \'active\' }; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create meta eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Create task with initial meta
      await app.model('task').create({
        id: TASK_ID,
        workflow_id: WORKFLOW_ID,
        task_template_id: TASK_TEMPLATE_ID,
        name: 'Meta Task Instance',
        description: 'Task for meta update',
        performer_users: ['test-performer'],
        performer_usernames: ['test-performer'],
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        meta: { existing: 'value' },
      }).catch(TestApp.catch('Failed to create task'));

      // Trigger meta event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: META_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify meta event was created
      const metaEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: META_EVENT_TEMPLATE_ID },
        });
      expect(metaEvent).toBeDefined();
      expect(metaEvent.event_type_id).toBe(8);
      expect(metaEvent.done).toBe(true);

      // Verify task meta was updated
      const updatedTask = await app.model('task').findOne({
        where: { id: TASK_ID },
      });
      expect(updatedTask.meta).toEqual({
        existing: 'value',
        department: 'Engineering',
        status: 'active',
      });

      // Verify event result contains meta
      expect(metaEvent.data.result.meta).toEqual({
        existing: 'value',
        department: 'Engineering',
        status: 'active',
      });
    });

    it('should create and process meta delete event', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900002;
      const TASK_TEMPLATE_ID = 900002;
      const META_EVENT_TEMPLATE_ID = 900002001;
      const WORKFLOW_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
      const TASK_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Delete Workflow',
        description: 'Workflow for testing meta delete event',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create meta delete event template
      await app.model('eventTemplate').create({
        id: META_EVENT_TEMPLATE_ID,
        event_type_id: 8, // meta type = 8
        name: 'Delete Meta Event',
        description: 'Event to delete task meta fields',
        json_schema: JSON.stringify({
          eventMeta: 'delete',
          taskId: `() => { return '${TASK_ID}'; }`,
          metaFunction: '() => { return { department: \'Engineering\' }; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create meta delete eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Delete Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Create task with meta fields
      await app.model('task').create({
        id: TASK_ID,
        workflow_id: WORKFLOW_ID,
        task_template_id: TASK_TEMPLATE_ID,
        name: 'Meta Delete Task Instance',
        description: 'Task for meta delete',
        type: 'user',
        performer_user_name: 'test-performer',
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        meta: { department: 'Engineering', status: 'active', region: 'US' },
        status_id: 1,
        status_name: 'open',
      }).catch(TestApp.catch('Failed to create task'));

      // Trigger meta delete event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: META_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify meta delete event was created
      const metaEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: META_EVENT_TEMPLATE_ID },
        });
      expect(metaEvent).toBeDefined();
      expect(metaEvent.event_type_id).toBe(8);
      expect(metaEvent.done).toBe(true);

      // Verify task meta was updated (department removed, others remain)
      const updatedTask = await app.model('task').findOne({
        where: { id: TASK_ID },
      });
      expect(updatedTask.meta).toEqual({
        status: 'active',
        region: 'US',
      });

      // Verify event result contains updated meta
      expect(metaEvent.data.result.meta).toEqual({
        status: 'active',
        region: 'US',
      });
    });

    it('should return meta event with result containing updated meta', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900003;
      const TASK_TEMPLATE_ID = 900003;
      const META_EVENT_TEMPLATE_ID = 900003001;
      const WORKFLOW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';
      const TASK_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Result Workflow',
        description: 'Workflow for testing meta result',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create meta event template
      await app.model('eventTemplate').create({
        id: META_EVENT_TEMPLATE_ID,
        event_type_id: 8, // meta type = 8
        name: 'Meta Result Event',
        description: 'Event with meta result',
        json_schema: JSON.stringify({
          eventMeta: 'update',
          taskId: `() => { return '${TASK_ID}'; }`,
          metaFunction: '() => { return { priority: \'high\', assignee: \'john\' }; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create meta eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Result Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Create task
      await app.model('task').create({
        id: TASK_ID,
        workflow_id: WORKFLOW_ID,
        task_template_id: TASK_TEMPLATE_ID,
        name: 'Meta Result Task Instance',
        description: 'Task for result',
        type: 'user',
        performer_user_name: 'test-performer',
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        meta: {},
        status_id: 1,
        status_name: 'open',
      }).catch(TestApp.catch('Failed to create task'));

      // Trigger meta event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: META_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Retrieve event
      const metaEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: META_EVENT_TEMPLATE_ID },
        });
      expect(metaEvent).toBeDefined();
      expect(metaEvent.data).toBeDefined();
      expect(metaEvent.data.result).toBeDefined();
      expect(metaEvent.data.result.meta).toBeDefined();
      expect(metaEvent.data.result.meta).toEqual({
        priority: 'high',
        assignee: 'john',
      });
    });

    it('should mark meta event as done with no pending status', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 900004;
      const TASK_TEMPLATE_ID = 900004;
      const META_EVENT_TEMPLATE_ID = 900004001;
      const WORKFLOW_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';
      const TASK_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Status Workflow',
        description: 'Workflow for testing meta status',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create meta event template
      await app.model('eventTemplate').create({
        id: META_EVENT_TEMPLATE_ID,
        event_type_id: 8, // meta type = 8
        name: 'Meta Status Event',
        description: 'Event with status check',
        json_schema: JSON.stringify({
          eventMeta: 'update',
          taskId: `() => { return '${TASK_ID}'; }`,
          metaFunction: '() => { return { version: \'1.0\' }; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create meta eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Meta Status Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Create task
      await app.model('task').create({
        id: TASK_ID,
        workflow_id: WORKFLOW_ID,
        task_template_id: TASK_TEMPLATE_ID,
        name: 'Meta Status Task Instance',
        description: 'Task for status',
        type: 'user',
        performer_user_name: 'test-performer',
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        meta: {},
        status_id: 1,
        status_name: 'open',
      }).catch(TestApp.catch('Failed to create task'));

      // Trigger meta event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: META_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify meta event properties
      const metaEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: META_EVENT_TEMPLATE_ID },
        });
      expect(metaEvent.done).toBe(true);
      expect(metaEvent.due_date).toBeNull();
      expect(metaEvent.cancellation_type_id).toBeNull();
      expect(metaEvent.event_type_id).toBe(8);
    });
  });
});
