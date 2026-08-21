const { TestApp } = require('./test-app');

describe('EventBusiness - Stop type events', () => {
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

  describe('Stop type events', () => {
    it('should complete stop event immediately with no other events', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 800001;
      const STOP_EVENT_TEMPLATE_ID = 800001001;
      const WORKFLOW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Stop Workflow',
        description: 'Workflow for testing stop event type',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create stop event template
      await app.model('eventTemplate').create({
        id: STOP_EVENT_TEMPLATE_ID,
        event_type_id: 4, // stop type = 4
        name: 'Stop Event',
        description: 'Event to stop all in-progress events',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create stop eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Stop Test Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger stop event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
        eventTemplateId: STOP_EVENT_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify stop event created
      const [stopEvent] = await app.model('event').findAll({
        where: { event_template_id: STOP_EVENT_TEMPLATE_ID },
      });
      expect(stopEvent).toBeDefined();
      expect(stopEvent.done).toBe(true); // Stop event completes immediately
      expect(stopEvent.event_type_id).toBe(4);

      // Verify stop result exists
      expect(stopEvent.data).toBeDefined();
      expect(stopEvent.data.result).toBeDefined();
      expect(stopEvent.data.result.stop).toBeDefined();

      // Verify stop event itself was not cancelled
      const [verifyStopEvent] = await app.model('event').findAll({
        where: { id: stopEvent.id },
      });
      expect(verifyStopEvent.cancellation_type_id).toBeNull();
    });

    it('should stop in-progress events when triggered', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 800002;
      const STOP_EVENT_TEMPLATE_ID = 800002001;
      const EVENT_TEMPLATE_ID_1 = 800002002;
      const EVENT_TEMPLATE_ID_2 = 800002003;
      const WORKFLOW_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Stop Event Workflow',
        description: 'Workflow for testing stop with other events',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create first event template that will be stopped
      await app.model('eventTemplate').create({
        id: EVENT_TEMPLATE_ID_1,
        event_type_id: 1,
        name: 'Event To Stop 1',
        description: 'First event that will be stopped',
        json_schema: JSON.stringify({
          emails: [],
          subject: 'Test',
          fullText: 'Test',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create eventTemplate 1'));

      // Create second event template that will be stopped
      await app.model('eventTemplate').create({
        id: EVENT_TEMPLATE_ID_2,
        event_type_id: 1,
        name: 'Event To Stop 2',
        description: 'Second event that will be stopped',
        json_schema: JSON.stringify({
          emails: [],
          subject: 'Test',
          fullText: 'Test',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create eventTemplate 2'));

      // Create stop event template
      await app.model('eventTemplate').create({
        id: STOP_EVENT_TEMPLATE_ID,
        event_type_id: 4,
        name: 'Stop Event',
        description: 'Stop event',
        json_schema: JSON.stringify({}),
        html_template: '',
      }).catch(TestApp.catch('Failed to create stop eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Stop Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Create first in-progress event that will be stopped
      const event1 = await app.model('event').create({
        workflow_id: WORKFLOW_ID,
        event_template_id: EVENT_TEMPLATE_ID_1,
        event_type_id: 1,
        name: 'Event Instance 1',
        done: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
      }).catch(TestApp.catch('Failed to create event1'));

      // Create second in-progress event that will be stopped
      const event2 = await app.model('event').create({
        workflow_id: WORKFLOW_ID,
        event_template_id: EVENT_TEMPLATE_ID_2,
        event_type_id: 1,
        name: 'Event Instance 2',
        done: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
      }).catch(TestApp.catch('Failed to create event2'));

      // Trigger stop event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
        eventTemplateId: STOP_EVENT_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Get stop event
      const [stopEvent] = await app.model('event').findAll({
        where: { event_template_id: STOP_EVENT_TEMPLATE_ID },
      });

      // Verify both events were stopped
      expect(stopEvent.data.result.stop.stoppedEventsIds).toContain(event1.id);
      expect(stopEvent.data.result.stop.stoppedEventsIds).toContain(event2.id);
      expect(stopEvent.data.result.stop.stoppedEventsIds.length).toBe(2);

      // Verify event 1 is cancelled
      const [cancelledEvent1] = await app.model('event').findAll({
        where: { id: event1.id },
      });
      expect(cancelledEvent1.cancellation_type_id).toBe(1);
      expect(cancelledEvent1.done).toBe(true);

      // Verify event 2 is cancelled
      const [cancelledEvent2] = await app.model('event').findAll({
        where: { id: event2.id },
      });
      expect(cancelledEvent2.cancellation_type_id).toBe(1);
      expect(cancelledEvent2.done).toBe(true);
    });

    it('should stop only filtered events based on eventTemplateIdsFilter', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 800003;
      const STOP_EVENT_TEMPLATE_ID = 800003001;
      const EVENT_TEMPLATE_ID_1 = 800003002;
      const EVENT_TEMPLATE_ID_2 = 800003003;
      const WORKFLOW_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Stop Filter Workflow',
        description: 'Workflow for testing event filter',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create event templates
      await app.model('eventTemplate').create({
        id: EVENT_TEMPLATE_ID_1,
        event_type_id: 1,
        name: 'Event Type 1',
        description: 'First event type',
        json_schema: JSON.stringify({
          emails: [],
          subject: 'Test',
          fullText: 'Test',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create eventTemplate 1'));

      await app.model('eventTemplate').create({
        id: EVENT_TEMPLATE_ID_2,
        event_type_id: 1,
        name: 'Event Type 2',
        description: 'Second event type',
        json_schema: JSON.stringify({
          emails: [],
          subject: 'Test',
          fullText: 'Test',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create eventTemplate 2'));

      // Create stop event template with eventTemplateIdsFilter
      await app.model('eventTemplate').create({
        id: STOP_EVENT_TEMPLATE_ID,
        event_type_id: 4,
        name: 'Filtered Stop',
        description: 'Stop event with event filter',
        json_schema: JSON.stringify({
          eventTemplateIdsFilter: [EVENT_TEMPLATE_ID_1],
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create stop eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Filter Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Create in-progress events
      const event1 = await app.model('event').create({
        workflow_id: WORKFLOW_ID,
        event_template_id: EVENT_TEMPLATE_ID_1,
        event_type_id: 1,
        name: 'Event Type 1 Instance',
        done: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
      }).catch(TestApp.catch('Failed to create event1'));

      const event2 = await app.model('event').create({
        workflow_id: WORKFLOW_ID,
        event_template_id: EVENT_TEMPLATE_ID_2,
        event_type_id: 1,
        name: 'Event Type 2 Instance',
        done: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
      }).catch(TestApp.catch('Failed to create event2'));

      // Trigger filtered stop event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
        eventTemplateId: STOP_EVENT_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Get stop event
      const [stopEvent] = await app.model('event').findAll({
        where: { event_template_id: STOP_EVENT_TEMPLATE_ID },
      });

      // Verify only filtered event was stopped
      expect(stopEvent.data.result.stop.stoppedEventsIds).toContain(event1.id);
      expect(stopEvent.data.result.stop.stoppedEventsIds).not.toContain(event2.id);

      // Verify event 1 is cancelled
      const [cancelledEvent1] = await app.model('event').findAll({
        where: { id: event1.id },
      });
      expect(cancelledEvent1.cancellation_type_id).toBe(1);
      expect(cancelledEvent1.done).toBe(true);

      // Verify event 2 is still in progress
      const [unaffectedEvent2] = await app.model('event').findAll({
        where: { id: event2.id },
      });
      expect(unaffectedEvent2.done).toBe(false);
      expect(unaffectedEvent2.cancellation_type_id).toBeNull();
    });
  });
});
