const { TestApp } = require('./test-app');
const HttpRequest = require('../src/lib/http_request');

// Helper to generate unique unit IDs
let unitIdCounter = 0;
function generateUnitId() {
  return 2000000 + (unitIdCounter++);
}

describe('EventBusiness - User type events', () => {
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

  describe('addMember / addMemberIpn', () => {
    it('should create and process addMember user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900001;
      const USER_EVENT_TEMPLATE_ID = 900001001;
      const WORKFLOW_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
      const UNIT_ID = generateUnitId();
      const USER_ID = '000000000000000000000001';

      // Create unit for side effect verification
      await app.model('unit').create({
        id: UNIT_ID,
        name: 'Test Unit',
        description: 'Unit for testing addMember',
        parent_id: null,
        based_on: [],
        members: [],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
      }).catch(TestApp.catch('Failed to create unit'));

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'User Event Workflow',
        description: 'Workflow for testing user event types',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6, // user type = 6
        name: 'Add Member Event',
        description: 'Event to add user member',
        json_schema: JSON.stringify({
          eventUserType: 'addMember',
          unitId: `() => { return ${UNIT_ID}; }`,
          userId: `() => { return '${USER_ID}'; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'User Event Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);

      // Verify side effect: check unit members were updated
      const updatedUnit = await app.model('unit').findByPk(UNIT_ID);
      expect(updatedUnit).toBeDefined();
      expect(updatedUnit.members).toContain(USER_ID);
    });
  });

  describe('addRequestedMember', () => {
    it('should create and process addRequestedMember user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900002;
      const USER_EVENT_TEMPLATE_ID = 900002001;
      const WORKFLOW_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Requested Member Workflow',
        description: 'Workflow for testing addRequestedMember',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Add Requested Member Event',
        description: 'Event to add requested member',
        json_schema: JSON.stringify({
          eventUserType: 'addRequestedMember',
          unitId: '() => { return 1000002; }',
          ipn: '() => { return \'REQUESTED_IPN\'; }',
          userName: '() => { return \'test-user\'; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Requested Member Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('addMemberIpnList', () => {
    it('should create and process addMemberIpnList user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900003;
      const USER_EVENT_TEMPLATE_ID = 900003001;
      const WORKFLOW_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
      const UNIT_ID = generateUnitId();
      const IPN_LIST = ['IPN1', 'IPN2'];

      // Create unit for side effect verification
      await app.model('unit').create({
        id: UNIT_ID,
        name: 'Test Unit',
        description: 'Unit for testing addMemberIpnList',
        parent_id: null,
        based_on: [],
        members: [],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
      }).catch(TestApp.catch('Failed to create unit'));

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Member IPN List Workflow',
        description: 'Workflow for testing addMemberIpnList',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Add Member IPN List Event',
        description: 'Event to add member IPN list',
        json_schema: JSON.stringify({
          eventUserType: 'addMemberIpnList',
          unitId: `() => { return ${UNIT_ID}; }`,
          ipnList: `() => { return ${JSON.stringify(IPN_LIST)}; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Member IPN List Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);

      // Verify side effect: check unit member IPNs were updated
      const updatedUnit = await app.model('unit').findByPk(UNIT_ID);
      expect(updatedUnit).toBeDefined();
      IPN_LIST.forEach(ipn => {
        expect(updatedUnit.members_ipn).toContain(ipn);
      });
    });
  });

  describe('addHeadIpnList', () => {
    it('should create and process addHeadIpnList user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900004;
      const USER_EVENT_TEMPLATE_ID = 900004001;
      const WORKFLOW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';
      const UNIT_ID = generateUnitId();
      const HEAD_IPN_LIST = ['HEAD_IPN1', 'HEAD_IPN2'];

      // Create unit for side effect verification
      await app.model('unit').create({
        id: UNIT_ID,
        name: 'Test Unit',
        description: 'Unit for testing addHeadIpnList',
        parent_id: null,
        based_on: [],
        members: [],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
      }).catch(TestApp.catch('Failed to create unit'));

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Head IPN List Workflow',
        description: 'Workflow for testing addHeadIpnList',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Add Head IPN List Event',
        description: 'Event to add head IPN list',
        json_schema: JSON.stringify({
          eventUserType: 'addHeadIpnList',
          unitId: `() => { return ${UNIT_ID}; }`,
          ipnList: `() => { return ${JSON.stringify(HEAD_IPN_LIST)}; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Head IPN List Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);

      // Verify side effect: check unit head IPNs were updated
      const updatedUnit = await app.model('unit').findByPk(UNIT_ID);
      expect(updatedUnit).toBeDefined();
      HEAD_IPN_LIST.forEach(ipn => {
        expect(updatedUnit.heads_ipn).toContain(ipn);
      });
    });
  });

  describe('addHead / addHeadIpn', () => {
    it('should create and process addHead user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900005;
      const USER_EVENT_TEMPLATE_ID = 900005001;
      const WORKFLOW_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';
      const UNIT_ID = generateUnitId();
      const USER_ID = '000000000000000000000001';

      // Create unit for side effect verification
      await app.model('unit').create({
        id: UNIT_ID,
        name: 'Test Unit',
        description: 'Unit for testing addHead',
        parent_id: null,
        based_on: [],
        members: [],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
      }).catch(TestApp.catch('Failed to create unit'));

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Add Head Workflow',
        description: 'Workflow for testing addHead',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Add Head Event',
        description: 'Event to add head',
        json_schema: JSON.stringify({
          eventUserType: 'addHead',
          unitId: `() => { return ${UNIT_ID}; }`,
          userId: `() => { return '${USER_ID}'; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Add Head Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);

      // Verify side effect: check unit heads were updated
      const updatedUnit = await app.model('unit').findByPk(UNIT_ID);
      expect(updatedUnit).toBeDefined();
      expect(updatedUnit.heads).toContain(USER_ID);
    });
  });

  describe('removeMember', () => {
    it('should create and process removeMember user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900006;
      const USER_EVENT_TEMPLATE_ID = 900006001;
      const WORKFLOW_ID = 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c';
      const UNIT_ID = generateUnitId();
      const USER_ID = '000000000000000000000001';

      // Create unit with member already added for removal test
      await app.model('unit').create({
        id: UNIT_ID,
        name: 'Test Unit',
        description: 'Unit for testing removeMember',
        parent_id: null,
        based_on: [],
        members: [USER_ID],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
      }).catch(TestApp.catch('Failed to create unit'));

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Member Workflow',
        description: 'Workflow for testing removeMember',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Member Event',
        description: 'Event to remove member',
        json_schema: JSON.stringify({
          eventUserType: 'removeMember',
          unitId: `() => { return ${UNIT_ID}; }`,
          userId: `() => { return '${USER_ID}'; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Member Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);

      // Verify side effect: check member was removed from unit
      const updatedUnit = await app.model('unit').findByPk(UNIT_ID);
      expect(updatedUnit).toBeDefined();
      expect(updatedUnit.members).not.toContain(USER_ID);
    });
  });

  describe('addHeadList / addMemberList / removeMemberList / removeHeadList', () => {
    it('should create and process addMemberList user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900007;
      const USER_EVENT_TEMPLATE_ID = 900007001;
      const WORKFLOW_ID = 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d';
      const UNIT_ID = generateUnitId();
      const USER_ID_LIST = ['000000000000000000000001', '000000000000000000000002'];

      // Create unit for side effect verification
      await app.model('unit').create({
        id: UNIT_ID,
        name: 'Test Unit',
        description: 'Unit for testing member list operations',
        parent_id: null,
        based_on: [],
        members: [],
        heads: [],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
      }).catch(TestApp.catch('Failed to create unit'));

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Member List Workflow',
        description: 'Workflow for testing member list operations',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Add Member List Event',
        description: 'Event to add member list',
        json_schema: JSON.stringify({
          eventUserType: 'addMemberList',
          unitId: `() => { return ${UNIT_ID}; }`,
          userIdList: `() => { return ${JSON.stringify(USER_ID_LIST)}; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Member List Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);

      // Verify side effect: check multiple members were added to unit
      const updatedUnit = await app.model('unit').findByPk(UNIT_ID);
      expect(updatedUnit).toBeDefined();
      USER_ID_LIST.forEach(userId => {
        expect(updatedUnit.members).toContain(userId);
      });
    });
  });

  describe('removeHead', () => {
    it('should create and process removeHead user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900008;
      const USER_EVENT_TEMPLATE_ID = 900008001;
      const WORKFLOW_ID = 'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e';
      const UNIT_ID = generateUnitId();
      const USER_ID = '000000000000000000000001';

      // Create unit with head already added for removal test
      await app.model('unit').create({
        id: UNIT_ID,
        name: 'Test Unit',
        description: 'Unit for testing removeHead',
        parent_id: null,
        based_on: [],
        members: [],
        heads: [USER_ID],
        data: {},
        menu_config: {},
        allow_tokens: [],
        heads_ipn: [],
        members_ipn: [],
      }).catch(TestApp.catch('Failed to create unit'));

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Head Workflow',
        description: 'Workflow for testing removeHead',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Head Event',
        description: 'Event to remove head',
        json_schema: JSON.stringify({
          eventUserType: 'removeHead',
          unitId: `() => { return ${UNIT_ID}; }`,
          userId: `() => { return '${USER_ID}'; }`,
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Head Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);

      // Verify side effect: check head was removed from unit
      const updatedUnit = await app.model('unit').findByPk(UNIT_ID);
      expect(updatedUnit).toBeDefined();
      expect(updatedUnit.heads).not.toContain(USER_ID);
    });
  });

  describe('removeMemberIpn', () => {
    it('should create and process removeMemberIpn user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900009;
      const USER_EVENT_TEMPLATE_ID = 900009001;
      const WORKFLOW_ID = 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Member IPN Workflow',
        description: 'Workflow for testing removeMemberIpn',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Member IPN Event',
        description: 'Event to remove member IPN',
        json_schema: JSON.stringify({
          eventUserType: 'removeMemberIpn',
          unitId: '() => { return 1000002; }',
          ipn: '() => { return \'MEMBER_IPN\'; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Member IPN Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('removeMemberIpnList', () => {
    it('should create and process removeMemberIpnList user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900010;
      const USER_EVENT_TEMPLATE_ID = 900010001;
      const WORKFLOW_ID = 'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Member IPN List Workflow',
        description: 'Workflow for testing removeMemberIpnList',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Member IPN List Event',
        description: 'Event to remove member IPN list',
        json_schema: JSON.stringify({
          eventUserType: 'removeMemberIpnList',
          unitId: '() => { return 1000002; }',
          ipnList: '() => { return [\'IPN1\', \'IPN2\']; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Member IPN List Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('removeHeadIpn', () => {
    it('should create and process removeHeadIpn user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900011;
      const USER_EVENT_TEMPLATE_ID = 900011001;
      const WORKFLOW_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Head IPN Workflow',
        description: 'Workflow for testing removeHeadIpn',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Head IPN Event',
        description: 'Event to remove head IPN',
        json_schema: JSON.stringify({
          eventUserType: 'removeHeadIpn',
          unitId: '() => { return 1000002; }',
          ipn: '() => { return \'HEAD_IPN\'; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Head IPN Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('removeHeadIpnList', () => {
    it('should create and process removeHeadIpnList user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900012;
      const USER_EVENT_TEMPLATE_ID = 900012001;
      const WORKFLOW_ID = 'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Head IPN List Workflow',
        description: 'Workflow for testing removeHeadIpnList',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Head IPN List Event',
        description: 'Event to remove head IPN list',
        json_schema: JSON.stringify({
          eventUserType: 'removeHeadIpnList',
          unitId: '() => { return 1000002; }',
          ipnList: '() => { return [\'HEAD_IPN1\', \'HEAD_IPN2\']; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Head IPN List Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('updateUser', () => {
    let httpSendSpy;

    beforeAll(() => {
      httpSendSpy = jest.spyOn(HttpRequest, 'send').mockResolvedValue('ok');
    });

    afterAll(() => {
      httpSendSpy.mockRestore();
    });

    it('should create and process updateUser user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900013;
      const USER_EVENT_TEMPLATE_ID = 900013001;
      const WORKFLOW_ID = 'a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Update User Workflow',
        description: 'Workflow for testing updateUser',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Update User Event',
        description: 'Event to update user',
        json_schema: JSON.stringify({
          eventUserType: 'updateUser',
          userId: '() => { return \'000000000000000000000001\'; }',
          userData: '() => { return { gender: \'M\' }; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Update User Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('searchUser', () => {
    let httpSendSpy;

    beforeAll(() => {
      httpSendSpy = jest.spyOn(HttpRequest, 'send').mockResolvedValue([]);
    });

    afterAll(() => {
      httpSendSpy.mockRestore();
    });

    it('should create and process searchUser user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900014;
      const USER_EVENT_TEMPLATE_ID = 900014001;
      const WORKFLOW_ID = 'b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Search User Workflow',
        description: 'Workflow for testing searchUser',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Search User Event',
        description: 'Event to search user',
        json_schema: JSON.stringify({
          eventUserType: 'searchUser',
          searchData: {
            userIds: '() => { return []; }',
            unitIds: '() => { return []; }',
            ids: '() => { return []; }',
            codes: '() => { return []; }',
            code: '() => { return \'\'; }',
            edrpou: '() => { return []; }',
            search: '() => { return \'test\'; }',
            basedOn: '() => { return []; }',
          },
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Search User Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('addMembersToUnitsIpn', () => {
    it('should create and process addMembersToUnitsIpn user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900015;
      const USER_EVENT_TEMPLATE_ID = 900015001;
      const WORKFLOW_ID = 'c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Add Members To Units IPN Workflow',
        description: 'Workflow for testing addMembersToUnitsIpn',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Add Members To Units IPN Event',
        description: 'Event to add members to units IPN',
        json_schema: JSON.stringify({
          eventUserType: 'addMembersToUnitsIpn',
          unitIdList: '() => { return [1000001, 1000002]; }',
          ipnList: '() => { return [\'IPN1\', \'IPN2\']; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Add Members To Units IPN Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('removeMembersFromUnitsIpn', () => {
    it('should create and process removeMembersFromUnitsIpn user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900016;
      const USER_EVENT_TEMPLATE_ID = 900016001;
      const WORKFLOW_ID = 'd6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9fa0';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Members From Units IPN Workflow',
        description: 'Workflow for testing removeMembersFromUnitsIpn',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Members From Units IPN Event',
        description: 'Event to remove members from units IPN',
        json_schema: JSON.stringify({
          eventUserType: 'removeMembersFromUnitsIpn',
          unitIdList: '() => { return [1000001, 1000002]; }',
          ipnList: '() => { return [\'IPN1\', \'IPN2\']; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Members From Units IPN Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });

  describe('removeMembersFromUnitsByIpn', () => {
    it('should create and process removeMembersFromUnitsByIpn user event', async () => {
      const WORKFLOW_TEMPLATE_ID = 900017;
      const USER_EVENT_TEMPLATE_ID = 900017001;
      const WORKFLOW_ID = 'e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9fa0b1';

      await app.model('workflowTemplate').create({
        id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Members From Units By IPN Workflow',
        description: 'Workflow for testing removeMembersFromUnitsByIpn',
        xml_bpmn_schema: '<?xml version="1.0" encoding="UTF-8"?>',
        data: {},
        is_active: true,
        errors_subscribers: [],
      }).catch(TestApp.catch('Failed to create workflowTemplate'));

      await app.model('eventTemplate').create({
        id: USER_EVENT_TEMPLATE_ID,
        event_type_id: 6,
        name: 'Remove Members From Units By IPN Event',
        description: 'Event to remove members from units by IPN',
        json_schema: JSON.stringify({
          eventUserType: 'removeMembersFromUnitsByIpn',
          unitIdList: '() => { return [1000001, 1000002]; }',
          ipnList: '() => { return [\'IPN1\', \'IPN2\']; }',
        }),
        html_template: '',
      }).catch(TestApp.catch('Failed to create user eventTemplate'));

      await app.model('workflow').create({
        id: WORKFLOW_ID,
        workflow_template_id: WORKFLOW_TEMPLATE_ID,
        name: 'Remove Members From Units By IPN Workflow Instance',
        is_final: false,
        created_by: 'test-user',
        updated_by: 'test-user',
        data: {},
        workflow_status_id: 1,
        user_data: {},
        has_unresolved_errors: false,
        statuses: {},
      }).catch(TestApp.catch('Failed to create workflow'));

      const result = await app.eventBusiness.createFromMessage({
        workflowId: WORKFLOW_ID,
        eventTemplateId: USER_EVENT_TEMPLATE_ID,
        workflowTemplateId: WORKFLOW_TEMPLATE_ID,
      });
      expect(result).toBe(true);

      const userEvent = await app.model('event')
        .findOne({
          where: { workflow_id: WORKFLOW_ID, event_template_id: USER_EVENT_TEMPLATE_ID },
        });
      expect(userEvent).toBeDefined();
      expect(userEvent.event_type_id).toBe(6);
      expect(userEvent.done).toBe(true);
    });
  });
});
