module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Insert initial data into event_types table
      INSERT INTO public.event_types (id, name, created_at, updated_at) VALUES
      (1, 'notification', '2025-07-29 10:25:52.467+00', '2025-07-29 10:25:52.467+00'),
      (2, 'delay', '2025-07-29 10:25:52.467+00', '2025-07-29 10:25:52.467+00'),
      (3, 'request', '2025-07-29 10:25:52.507+00', '2025-07-29 10:25:52.507+00'),
      (4, 'stop', '2025-07-29 10:25:52.573+00', '2025-07-29 10:25:52.573+00'),
      (5, 'unit', '2025-07-29 10:25:53.102+00', '2025-07-29 10:25:53.102+00'),
      (6, 'user', '2025-07-29 10:25:53.102+00', '2025-07-29 10:25:53.102+00'),
      (7, 'workflow', '2025-07-29 10:25:53.912+00', '2025-07-29 10:25:53.912+00'),
      (8, 'meta', '2025-07-29 10:25:54.259+00', '2025-07-29 10:25:54.259+00'),
      (9, 'clear', '2025-07-29 10:25:54.452+00', '2025-07-29 10:25:54.452+00'),
      (10, 'file', '2025-07-29 10:25:54.704+00', '2025-07-29 10:25:54.704+00');

      -- Insert initial data into gateway_types table
      INSERT INTO public.gateway_types (id, name, created_at, updated_at) VALUES
      (1, 'exclusive', '2025-07-29 10:25:52.421+00', '2025-07-29 10:25:52.421+00'),
      (2, 'parallel', '2025-07-29 10:25:52.421+00', '2025-07-29 10:25:52.421+00'),
      (3, 'inclusive', '2025-07-29 10:25:52.588+00', '2025-07-29 10:25:52.588+00');

      -- Insert initial data into ui_filters table
      INSERT INTO public.ui_filters (id, name, filter, is_active, created_at, updated_at) VALUES
      (1, 'My tasks', 'tasks.my.opened', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (2, 'Department tasks', 'tasks.unit.opened', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (3, 'My tasks archive', 'tasks.my.closed', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (4, 'Department tasks archive', 'tasks.unit.closed', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (5, 'Ordered services', 'workflows.not-draft', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (6, 'Drafts', 'workflows.draft', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (7, 'My ordered services', 'workflows.not-draft.ordered-by-myself', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (8, 'Department ordered services', 'workflows.not-draft.ordered-by-unit', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00'),
      (9, 'Ordered services for supervision', 'workflows.not-draft.observed-by-unit', true, '2025-07-29 10:25:53.831+00', '2025-07-29 10:25:53.831+00');

      -- Insert initial data into units table
      INSERT INTO public.units (id, parent_id, name, description, members, heads, data, created_at, updated_at, menu_config, allow_tokens, heads_ipn, members_ipn, based_on, requested_members) VALUES
      (1000000043, NULL, 'Readonly Support admin', 'Support administrator, views created processes, read-only access', '{}', '{}', '{}', '2025-07-29 10:25:54.316556+00', '2025-07-29 10:25:54.316556+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000012, NULL, 'Elastic admin', 'Elastic admin', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:54.230718+00', '2025-07-29 10:25:54.230718+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (100002, NULL, 'Workflow system admin', 'System administrator of process schemas available for one of the user units', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:54.073039+00', '2025-07-29 10:25:54.073039+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000000, NULL, 'Unit admin', 'Unit administrator, manages units where they are the head and defines their users', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:53.64335+00', '2025-07-29 10:25:53.64335+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000002, NULL, 'System admin', 'System administrator, configures process schemas and registries', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:53.519408+00', '2025-07-29 15:20:48.176+00', '{"navigation":{"workflow":{"Trash":false,"Drafts":false},"tasks":{},"registry":{"RegistryPage":true}}}', '{}', '{}', '{}', '{}', '{}'),
      (1000016, NULL, 'Mocks admin', 'Mocks admin', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:54.560672+00', '2025-07-29 10:25:54.560672+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000003, NULL, 'Support admin', 'Support administrator, views created processes', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:53.529012+00', '2025-07-29 10:25:53.529012+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000013, NULL, 'Individual', 'Default unit', '{}', '{}', '{}', '2025-07-29 10:25:54.159053+00', '2025-07-29 10:25:54.159053+00', '{
          "modules": {
            "inbox": {
              "InboxFilesListPage": false,
              "InboxFilesPage": false
            },
            "messages": {
              "MessageListPage": false,
              "MessagePage": false
            },
            "registry": {
              "RegistryPage": false
            },
            "tasks": {
              "InboxTasks": false,
              "UnitInboxTasks": false,
              "ClosedTasks": false,
              "UnitClosedTasks": false
            },
            "workflow": {
              "MyWorkflow": false,
              "Drafts": false,
              "Trash": false,
              "WorkflowPage": false
            }
          },
          "navigation": {
            "inbox": {
              "InboxFilesListPage": true
            },
            "messages": {
              "MessageListPage": true
            },
            "registry": {
              "RegistryPage": false
            },
            "tasks": {
              "CreateTaskButton": true,
              "InboxTasks": false,
              "UnitInboxTasks": false,
              "ClosedTasks": false,
              "UnitClosedTasks": false
            },
            "workflow": {
              "MyWorkflow": true,
              "Drafts": true,
              "Trash": true
            },
            "users": {
              "list": false
            }
          }
        }', '{}', '{}', '{}', '{}', '{}'),
      (1000000041, NULL, 'Readonly Security admin', 'Security administrator, manages units and defines their users, read-only access', '{}', '{}', '{}', '2025-07-29 10:25:54.316556+00', '2025-07-29 10:25:54.316556+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000000042, NULL, 'Readonly System admin', 'System administrator, configures process schemas and registries, read-only access', '{}', '{}', '{}', '2025-07-29 10:25:54.316556+00', '2025-07-29 10:25:54.316556+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (100003, NULL, 'Workflow support admin', 'Process support administrator, whose schemas are available for one of the user units', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:54.081759+00', '2025-07-29 10:25:54.081759+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000015, NULL, 'Snippet admin', 'Snippet admin', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:54.461468+00', '2025-07-29 10:25:54.461468+00', '{}', '{}', '{}', '{}', '{}', '{}'),
      (1000001, NULL, 'Security admin', 'Security administrator, manages units and defines their users', '{000000000000000000000001}', '{000000000000000000000001}', '{}', '2025-07-29 10:25:53.519408+00', '2025-07-29 10:25:53.519408+00', '{}', '{}', '{}', '{}', '{}', '{}');

      -- Insert unit_access data
      INSERT INTO public.unit_access (id, unit_id, type, data, created_at, updated_at, meta) VALUES
      (1, NULL, 'register', '{"strictAccess": {"keys": []}}', '2025-07-29 15:27:45.344+00', '2025-07-29 15:27:45.344+00', '{}'),
      (2, 1000002, 'register', '{"keys": {"hideKey": [], "allowHead": [], "allowRead": [102, 101, 100], "allowCreate": [102, 101, 100], "allowDelete": [102, 101, 100], "allowUpdate": [102, 101, 100], "allowHistory": [102, 101, 100]}}', '2025-07-29 15:27:45.449+00', '2025-07-29 15:28:16.406+00', '{"100": {"updatedAt": "2025-07-29T15:28:16.406Z"}, "101": {"updatedAt": "2025-07-29T15:28:06.253Z"}, "102": {"updatedAt": "2025-07-29T15:27:45.449Z"}}');
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DELETE FROM public.unit_access;
      DELETE FROM public.number_templates;
      DELETE FROM public.access_history_raw;
      DELETE FROM public.units;
      DELETE FROM public.ui_filters;
      DELETE FROM public.gateway_types;
      DELETE FROM public.event_types;
    `);
  }
};
