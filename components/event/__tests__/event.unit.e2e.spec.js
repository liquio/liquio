const { TestApp } = require('./test-app');

describe('EventBusiness - Unit type events', () => {
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

  describe('Unit type events', () => {
    it('should create and process unit event', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 600001;
      const UNIT_EVENT_TEMPLATE_ID = 600001001;
      const WORKFLOW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Unit Creation Workflow',
        description: 'Workflow for testing unit event type',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create unit event template with unit creation config
      await app.model('eventTemplate').create({
        id: UNIT_EVENT_TEMPLATE_ID,
        event_type_id: 5, // unit type = 5
        name: 'Create Unit',
        description: 'Event to create organizational unit',
        json_schema: JSON.stringify({
          eventUnitType: 'create',
          name: '() => \'Test Organization Unit\'',
          description: '() => \'A test organizational unit\'',
          headsIpn: '() => [\'1234567890\']',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create unit eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Unit Creation Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger unit event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: UNIT_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify unit event was created
      const [unitEvent] = await app.model('event').findAll({
        where: { event_template_id: UNIT_EVENT_TEMPLATE_ID },
      });
      expect(unitEvent).toBeDefined();
      expect(unitEvent.event_type_id).toBe(5);
      expect(unitEvent.workflow_id).toBe(WORKFLOW_ID);
      expect(unitEvent.done).toBe(true);
      expect(unitEvent.cancellation_type_id).toBeNull();

      // Verify unit was actually created as a side effect
      const createdUnitId = unitEvent.data.result.create.unitId;
      const unit = await app.model('unit').findOne({
        where: { id: createdUnitId },
      });
      expect(unit).toBeDefined();
      expect(unit.name).toBe('Test Organization Unit');
      expect(unit.heads_ipn).toEqual(['1234567890']);
    });

    it('should store unit creation result in event data', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 600002;
      const UNIT_EVENT_TEMPLATE_ID = 600002001;
      const WORKFLOW_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Unit Result Workflow',
        description: 'Workflow for testing unit result data',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create unit event template
      await app.model('eventTemplate').create({
        id: UNIT_EVENT_TEMPLATE_ID,
        event_type_id: 5,
        name: 'Create Department Unit',
        description: 'Event to create department unit',
        json_schema: JSON.stringify({
          eventUnitType: 'create',
          name: '() => \'Test Department\'',
          description: '() => \'Department for testing\'',
          headsIpn: '() => [\'9876543210\']',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create unit eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Unit Result Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger unit event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: UNIT_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Get unit event and verify result structure
      const [unitEvent] = await app.model('event').findAll({
        where: { event_template_id: UNIT_EVENT_TEMPLATE_ID },
      });

      expect(unitEvent).toBeDefined();
      expect(unitEvent.data).toBeDefined();
      expect(unitEvent.data.result).toBeDefined();
      expect(unitEvent.data.result.create).toBeDefined();
      expect(unitEvent.data.result.create.operation).toBe('create');
      expect(unitEvent.data.result.create.unit).toBeDefined();
      expect(unitEvent.data.result.create.unit.name).toBe('Test Department');
      expect(unitEvent.data.result.create.unit.headsIpn).toContain('9876543210');

      // Verify unit was actually created in the database
      const createdUnitId = unitEvent.data.result.create.unitId;
      const unit = await app.model('unit').findOne({
        where: { id: createdUnitId },
      });
      expect(unit).toBeDefined();
      expect(unit.name).toBe('Test Department');
      expect(unit.heads_ipn).toEqual(['9876543210']);
    });

    it('should complete unit event with success status', async () => {
      // Unique IDs for test entities
      const WORKFLOW_TEMPLATE_ID = 600003;
      const UNIT_EVENT_TEMPLATE_ID = 600003001;
      const WORKFLOW_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Unit Completion Workflow',
        description: 'Workflow for testing unit event completion',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create unit event template
      await app.model('eventTemplate').create({
        id: UNIT_EVENT_TEMPLATE_ID,
        event_type_id: 5,
        name: 'Create Division Unit',
        description: 'Event to create division unit',
        json_schema: JSON.stringify({
          eventUnitType: 'create',
          name: '() => \'Test Division\'',
          description: '() => \'Division for testing\'',
          headsIpn: '() => [\'5555555555\']',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create unit eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Unit Completion Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger unit event
      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: UNIT_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      // Verify unit event completed successfully
      const [unitEvent] = await app.model('event').findAll({
        where: { event_template_id: UNIT_EVENT_TEMPLATE_ID },
      });

      expect(unitEvent).toBeDefined();
      expect(unitEvent.done).toBe(true);
      expect(unitEvent.cancellation_type_id).toBeNull();
      expect(unitEvent.data.result.create.isHandled).toBe(true);

      // Verify unit was actually created in the database
      const createdUnitId = unitEvent.data.result.create.unitId;
      const unit = await app.model('unit').findOne({
        where: { id: createdUnitId },
      });
      expect(unit).toBeDefined();
      expect(unit.name).toBe('Test Division');
      expect(unit.heads_ipn).toEqual(['5555555555']);
    });

    it('should update unit with new heads', async () => {
      // Mock LiquioId HTTP calls for user searches by IPN (needed during unit update)
      app
        .nock('https://id-dev-oe.liquio.local:443', { allowUnmocked: true })
        .post('/user/info/ipn')
        .reply(200, [{ userId: 'mocked-user-1', ipn: '1111111111' }])
        .post('/user/info/ipn')
        .reply(200, [{ userId: 'mocked-user-2', ipn: '2222222222' }, { userId: 'mocked-user-3', ipn: '3333333333' }]);

      // First, create a unit that we'll update
      const CREATE_WORKFLOW_TEMPLATE_ID = 600004;
      const CREATE_UNIT_EVENT_TEMPLATE_ID = 600004001;
      const CREATE_WORKFLOW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';

      // Create workflow template
      await app.model('workflowTemplate').create({
        id: CREATE_WORKFLOW_TEMPLATE_ID,
        name: 'Unit Creation for Update Test',
        description: 'Workflow to create unit before update',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      // Create unit event template for creation
      await app.model('eventTemplate').create({
        id: CREATE_UNIT_EVENT_TEMPLATE_ID,
        event_type_id: 5,
        name: 'Create Unit for Update',
        description: 'Create unit for testing update',
        json_schema: JSON.stringify({
          eventUnitType: 'create',
          name: '() => \'Updatable Unit\'',
          description: '() => \'Unit to be updated\'',
          headsIpn: '() => [\'1111111111\']',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create unit eventTemplate'));

      // Create workflow instance
      await app.model('workflow').create({
        id: CREATE_WORKFLOW_ID,
        workflow_template_id: CREATE_WORKFLOW_TEMPLATE_ID,
        name: 'Unit Creation Workflow',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      // Trigger unit creation event
      const createResult = await app.eventBusiness.createFromMessage({
        workflowId: CREATE_WORKFLOW_ID,
        eventTemplateId: CREATE_UNIT_EVENT_TEMPLATE_ID,
        workflowTemplateId: CREATE_WORKFLOW_TEMPLATE_ID,
      });
      expect(createResult).toBe(true);

      // Get the created unit ID
      const [createEvent] = await app.model('event').findAll({
        where: { event_template_id: CREATE_UNIT_EVENT_TEMPLATE_ID },
      });
      expect(createEvent).toBeDefined();
      expect(createEvent.data).toBeDefined();
      expect(createEvent.data.result).toBeDefined();
      expect(createEvent.data.result.create).toBeDefined();
      const unitIdToUpdate = createEvent.data.result.create.unitId;

      // Now test the update
      const UPDATE_WORKFLOW_TEMPLATE_ID = 600005;
      const UPDATE_UNIT_EVENT_TEMPLATE_ID = 600005001;
      const UPDATE_WORKFLOW_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';

      // Create workflow template for update
      await app.model('workflowTemplate').create({
        id: UPDATE_WORKFLOW_TEMPLATE_ID,
        name: 'Unit Update Workflow',
        description: 'Workflow for testing unit update',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create update workflowTemplate'));

      // Create unit event template for update
      await app.model('eventTemplate').create({
        id: UPDATE_UNIT_EVENT_TEMPLATE_ID,
        event_type_id: 5,
        name: 'Update Unit',
        description: 'Event to update unit heads',
        json_schema: JSON.stringify({
          eventUnitType: 'update',
          id: `() => ${unitIdToUpdate}`,
          headsIpn: '() => [\'2222222222\', \'3333333333\']',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create update eventTemplate', true));

      // Create workflow instance
      await app.model('workflow').create({
        id: UPDATE_WORKFLOW_ID,
        workflow_template_id: UPDATE_WORKFLOW_TEMPLATE_ID,
        name: 'Unit Update Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create update workflow', true));

      // Trigger unit update event
      let updateResult;
      try {
        updateResult = await app.eventBusiness.createFromMessage({
          workflowId: UPDATE_WORKFLOW_ID,
          eventTemplateId: UPDATE_UNIT_EVENT_TEMPLATE_ID,
          workflowTemplateId: UPDATE_WORKFLOW_TEMPLATE_ID,
        });
        // Give the event a moment to be persisted
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('[DEBUG] updateResult error:', error.message, error.stack);
        throw error;
      }
      expect(updateResult).toBe(true);

      // Verify unit update event was created
      const [updateEvent] = await app.model('event').findAll({
        where: { event_template_id: UPDATE_UNIT_EVENT_TEMPLATE_ID },
      });
      expect(updateEvent).toBeDefined();
      expect(updateEvent.event_type_id).toBe(5);
      expect(updateEvent.done).toBe(true);
      expect(updateEvent.cancellation_type_id).toBeNull();

      // Verify unit was actually updated in the database
      const updatedUnit = await app.model('unit').findOne({
        where: { id: unitIdToUpdate },
      });
      expect(updatedUnit).toBeDefined();
      expect(updatedUnit.heads_ipn).toEqual(['2222222222', '3333333333']);
    });
  });
});
