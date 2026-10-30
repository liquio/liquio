module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create enum for access history operation types
      CREATE TYPE public.enum_access_history_operation_type AS ENUM (
        'added-to-head-unit',
        'added-to-member-unit',
        'deleted-from-head-unit',
        'deleted-from-member-unit',
        'added-to-admin',
        'deleted-from-admin'
      );

      -- Create enum for access history raw operation types
      CREATE TYPE public.enum_access_history_raw_operation_type AS ENUM (
        'heads_added',
        'members_added',
        'heads_ipn_added',
        'members_ipn_added',
        'heads_removed',
        'members_removed',
        'heads_ipn_removed',
        'members_ipn_removed'
      );

      -- Create enum for custom log templates operation types
      CREATE TYPE public.enum_custom_log_templates_operation_type AS ENUM (
        'read-document',
        'create-document',
        'update-document',
        'delete-document',
        'add-attach',
        'remove-attach',
        'generate-pdf',
        'sign',
        'commit',
        'admin-delete-unit',
        'admin-create-unit',
        'head-update-unit-members',
        'admin-update-unit',
        'admin-add-unit-heads',
        'admin-remove-unit-heads',
        'admin-add-unit-members',
        'admin-remove-unit-members',
        'event-created',
        'create-document-by-other-system',
        'generate-large-pdf',
        'performers-updated',
        'performers-unassigned',
        'performers-assigned'
      );

      -- Create enum for elastic reindex log status
      CREATE TYPE public.enum_elastic_reindex_log_status AS ENUM (
        'running',
        'finished',
        'error'
      );

      -- Create enum for event types name
      CREATE TYPE public.enum_event_types_name AS ENUM (
        'notification',
        'delay',
        'request',
        'stop',
        'unit',
        'user',
        'workflow',
        'meta',
        'clear',
        'file'
      );

      -- Create enum for gateway types name
      CREATE TYPE public.enum_gateway_types_name AS ENUM (
        'parallel',
        'exclusive',
        'inclusive'
      );

      -- Create enum for payment logs payment action
      CREATE TYPE public.enum_payment_logs_payment_action AS ENUM (
        'raw',
        'processed'
      );

      -- Create enum for share access access type
      CREATE TYPE public.enum_share_access_access_type AS ENUM (
        'create-workflow',
        'edit-task',
        'commit-task'
      );

      -- Create enum for snippets type
      CREATE TYPE public.enum_snippets_type AS ENUM (
        'control',
        'function',
        'container'
      );

      -- Create enum for unit access type
      CREATE TYPE public.enum_unit_access_type AS ENUM (
        'register'
      );

      -- Create enum for unit rules unit rule type
      CREATE TYPE public.enum_unit_rules_unit_rule_type AS ENUM (
        'exclusive'
      );

      -- Create enum for workflow debug service name
      CREATE TYPE public.enum_workflow_debug_service_name AS ENUM (
        'task',
        'event',
        'gateway',
        'manager'
      );

      -- Create enum for workflow errors type
      CREATE TYPE public.enum_workflow_errors_type AS ENUM (
        'error',
        'warning'
      );

      -- Create enum for workflow restarts type
      CREATE TYPE public.enum_workflow_restarts_type AS ENUM (
        'error',
        'manual'
      );

      -- Create enum for external service statuses state
      CREATE TYPE public.external_service_statuses_state AS ENUM (
        'received',
        'pending',
        'fulfilled',
        'rejected'
      );

      -- Create enum for external service statuses status data type
      CREATE TYPE public.external_service_statuses_status_data_type AS ENUM (
        'application/json',
        'application/xml'
      );

      CREATE TYPE public.workflows_elastic_reindex_state AS ENUM (
          'synced',
          'not_synced',
          'pending'
      );
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS public.workflows_elastic_reindex_state;
      DROP TYPE IF EXISTS public.external_service_statuses_status_data_type;
      DROP TYPE IF EXISTS public.external_service_statuses_state;
      DROP TYPE IF EXISTS public.enum_workflow_restarts_type;
      DROP TYPE IF EXISTS public.enum_workflow_errors_type;
      DROP TYPE IF EXISTS public.enum_workflow_debug_service_name;
      DROP TYPE IF EXISTS public.enum_unit_rules_unit_rule_type;
      DROP TYPE IF EXISTS public.enum_unit_access_type;
      DROP TYPE IF EXISTS public.enum_snippets_type;
      DROP TYPE IF EXISTS public.enum_share_access_access_type;
      DROP TYPE IF EXISTS public.enum_payment_logs_payment_action;
      DROP TYPE IF EXISTS public.enum_gateway_types_name;
      DROP TYPE IF EXISTS public.enum_event_types_name;
      DROP TYPE IF EXISTS public.enum_elastic_reindex_log_status;
      DROP TYPE IF EXISTS public.enum_custom_log_templates_operation_type;
      DROP TYPE IF EXISTS public.enum_access_history_raw_operation_type;
      DROP TYPE IF EXISTS public.enum_access_history_operation_type;
    `);
  }
};
