const BASE_UNIT_FIXTURES = [
  {
    'id': 1000000043,
    'parent_id': null,
    'based_on': [],
    'name': 'Readonly Support admin',
    'description': 'Support administrator, views created processes, read-only access',
    'members': [],
    'heads': [],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.316Z',
    'updated_at': '2025-07-29T10:25:54.316Z'
  },
  {
    'id': 1000012,
    'parent_id': null,
    'based_on': [],
    'name': 'Elastic admin',
    'description': 'Elastic admin',
    'members': [
      '000000000000000000000001'
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.230Z',
    'updated_at': '2025-07-29T10:25:54.230Z'
  },
  {
    'id': 100002,
    'parent_id': null,
    'based_on': [],
    'name': 'Workflow system admin',
    'description': 'System administrator of process schemas available for one of the user units',
    'members': [
      '000000000000000000000001'
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.073Z',
    'updated_at': '2025-07-29T10:25:54.073Z'
  },
  {
    'id': 1000000,
    'parent_id': null,
    'based_on': [],
    'name': 'Unit admin',
    'description': 'Unit administrator, manages units where they are the head and defines their users',
    'members': [
      '000000000000000000000001'
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:53.643Z',
    'updated_at': '2025-07-29T10:25:53.643Z'
  },
  {
    'id': 1000002,
    'parent_id': null,
    'based_on': [],
    'name': 'System admin',
    'description': 'System administrator, configures process schemas and registries',
    'members': [
      '000000000000000000000001',
      '61efddaa351d6219eee09043' // Add our test user
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {
      'navigation': {
        'workflow': {
          'Trash': false,
          'Drafts': false
        },
        'tasks': {},
        'registry': {
          'RegistryPage': true
        }
      }
    },
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:53.519Z',
    'updated_at': '2025-07-29T15:20:48.176Z'
  },
  {
    'id': 1000016,
    'parent_id': null,
    'based_on': [],
    'name': 'Mocks admin',
    'description': 'Mocks admin',
    'members': [
      '000000000000000000000001'
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.560Z',
    'updated_at': '2025-07-29T10:25:54.560Z'
  },
  {
    'id': 1000003,
    'parent_id': null,
    'based_on': [],
    'name': 'Support admin',
    'description': 'Support administrator, views created processes',
    'members': [
      '000000000000000000000001',
      '61efddaa351d6219eee09043' // Add our test user
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:53.529Z',
    'updated_at': '2025-07-29T10:25:53.529Z'
  },
  {
    'id': 1000013,
    'parent_id': null,
    'based_on': [],
    'name': 'Individual',
    'description': 'Default unit',
    'members': [],
    'heads': [],
    'data': {},
    'menu_config': {
      'modules': {
        'inbox': {
          'InboxFilesListPage': false,
          'InboxFilesPage': false
        },
        'messages': {
          'MessageListPage': false,
          'MessagePage': false
        },
        'registry': {
          'RegistryPage': false
        },
        'tasks': {
          'InboxTasks': false,
          'UnitInboxTasks': false,
          'ClosedTasks': false,
          'UnitClosedTasks': false
        },
        'workflow': {
          'MyWorkflow': false,
          'Drafts': false,
          'Trash': false,
          'WorkflowPage': false
        }
      },
      'navigation': {
        'inbox': {
          'InboxFilesListPage': true
        },
        'messages': {
          'MessageListPage': true
        },
        'registry': {
          'RegistryPage': false
        },
        'tasks': {
          'CreateTaskButton': true,
          'InboxTasks': false,
          'UnitInboxTasks': false,
          'ClosedTasks': false,
          'UnitClosedTasks': false
        },
        'workflow': {
          'MyWorkflow': true,
          'Drafts': true,
          'Trash': true
        },
        'users': {
          'list': false
        }
      }
    },
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.159Z',
    'updated_at': '2025-07-29T10:25:54.159Z'
  },
  {
    'id': 1000000041,
    'parent_id': null,
    'based_on': [],
    'name': 'Readonly Security admin',
    'description': 'Security administrator, manages units and defines their users, read-only access',
    'members': [],
    'heads': [],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.316Z',
    'updated_at': '2025-07-29T10:25:54.316Z'
  },
  {
    'id': 1000000042,
    'parent_id': null,
    'based_on': [],
    'name': 'Readonly System admin',
    'description': 'System administrator, configures process schemas and registries, read-only access',
    'members': [],
    'heads': [],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.316Z',
    'updated_at': '2025-07-29T10:25:54.316Z'
  },
  {
    'id': 100003,
    'parent_id': null,
    'based_on': [],
    'name': 'Workflow support admin',
    'description': 'Process support administrator, whose schemas are available for one of the user units',
    'members': [
      '000000000000000000000001'
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.081Z',
    'updated_at': '2025-07-29T10:25:54.081Z'
  },
  {
    'id': 1000015,
    'parent_id': null,
    'based_on': [],
    'name': 'Snippet admin',
    'description': 'Snippet admin',
    'members': [
      '000000000000000000000001'
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:54.461Z',
    'updated_at': '2025-07-29T10:25:54.461Z'
  },
  {
    'id': 1000001,
    'parent_id': null,
    'based_on': [],
    'name': 'Security admin',
    'description': 'Security administrator, manages units and defines their users',
    'members': [
      '000000000000000000000001'
    ],
    'heads': [
      '000000000000000000000001'
    ],
    'data': {},
    'menu_config': {},
    'allow_tokens': [],
    'heads_ipn': [],
    'members_ipn': [],
    'requested_members': [],
    'created_at': '2025-07-29T10:25:53.519Z',
    'updated_at': '2025-07-29T10:25:53.519Z'
  }
];

// Additional test units for specific scenarios
const UNIT_FIXTURES = [];

module.exports = { BASE_UNIT_FIXTURES, UNIT_FIXTURES };
