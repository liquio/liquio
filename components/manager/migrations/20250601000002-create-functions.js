module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create function for number template sequence creation
      CREATE OR REPLACE FUNCTION public.create_number_template_sequence()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          EXECUTE 'CREATE SEQUENCE IF NOT EXISTS number_template_sequence_' || NEW.id || 
                  ' START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1'
          USING NEW;
          RETURN NEW;
        END;
        $$;

      -- Create function for generic notify event
      CREATE OR REPLACE FUNCTION public.generic_notify_event()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          -- Use TG_ARGV[0] to access the event name argument
          PERFORM pg_notify(
            TG_ARGV[0], -- Event name passed during trigger creation
            json_build_object(
              'table', TG_TABLE_NAME, -- Automatically captures the table name
              'id', NEW.id,           -- Assumes all tables have an "id" column
              'action', TG_OP         -- Trigger operation (INSERT, UPDATE, DELETE)
            )::text
          );
          RETURN NEW;
        END;
        $$;

      -- Create function for updating access history raw
      CREATE OR REPLACE FUNCTION public.update_access_history_raw_function()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          -- Handle heads changes
          CASE
            WHEN CARDINALITY(NEW.heads) > CARDINALITY(OLD.heads) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'heads_added',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(NEW.heads) EXCEPT SELECT UNNEST(OLD.heads)), ',')
              );
            WHEN CARDINALITY(NEW.heads) < CARDINALITY(OLD.heads) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'heads_removed',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(OLD.heads) EXCEPT SELECT UNNEST(NEW.heads)), ',')
              );
            ELSE
              -- No change
          END CASE;

          -- Handle members changes
          CASE
            WHEN CARDINALITY(NEW.members) > CARDINALITY(OLD.members) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'members_added',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(NEW.members) EXCEPT SELECT UNNEST(OLD.members)), ',')
              );
            WHEN CARDINALITY(NEW.members) < CARDINALITY(OLD.members) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'members_removed',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(OLD.members) EXCEPT SELECT UNNEST(NEW.members)), ',')
              );
            ELSE
              -- No change
          END CASE;

          -- Handle heads_ipn changes
          CASE
            WHEN CARDINALITY(NEW.heads_ipn) > CARDINALITY(OLD.heads_ipn) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'heads_ipn_added',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(NEW.heads_ipn) EXCEPT SELECT UNNEST(OLD.heads_ipn)), ',')
              );
            WHEN CARDINALITY(NEW.heads_ipn) < CARDINALITY(OLD.heads_ipn) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'heads_ipn_removed',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(OLD.heads_ipn) EXCEPT SELECT UNNEST(NEW.heads_ipn)), ',')
              );
            ELSE
              -- No change
          END CASE;

          -- Handle members_ipn changes
          CASE
            WHEN CARDINALITY(NEW.members_ipn) > CARDINALITY(OLD.members_ipn) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'members_ipn_added',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(NEW.members_ipn) EXCEPT SELECT UNNEST(OLD.members_ipn)), ',')
              );
            WHEN CARDINALITY(NEW.members_ipn) < CARDINALITY(OLD.members_ipn) THEN
              INSERT INTO access_history_raw (unit_id, created_by, created_at, operation_type, member)
              VALUES (
                NEW.id, 
                CURRENT_USER, 
                NOW(), 
                'members_ipn_removed',
                ARRAY_TO_STRING(ARRAY(SELECT UNNEST(OLD.members_ipn) EXCEPT SELECT UNNEST(NEW.members_ipn)), ',')
              );
            ELSE
              -- No change
          END CASE;

          RETURN NEW;
        END;
        $$;

      -- Create function for setting workflow elastic reindex state as not synced
      CREATE OR REPLACE FUNCTION public.set_workflow_elastic_reindex_state_as_not_synced()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        BEGIN
          CASE 
            WHEN TO_JSON(NEW) ->> 'document_template_id' IS NOT NULL THEN
              -- Handle document updates
              UPDATE workflows 
              SET elastic_reindex_state = NULL 
              WHERE id = (
                SELECT tasks.workflow_id 
                FROM tasks 
                INNER JOIN documents d ON tasks.document_id = d.id AND d.id = NEW.id
              );
            ELSE
              -- Handle task updates
              UPDATE workflows 
              SET elastic_reindex_state = NULL 
              WHERE id = NEW.workflow_id;
          END CASE;
          
          RETURN NEW;
        END;
        $function$;
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS public.set_workflow_elastic_reindex_state_as_not_synced();
      DROP FUNCTION IF EXISTS public.update_access_history_raw_function();
      DROP FUNCTION IF EXISTS public.generic_notify_event();
      DROP FUNCTION IF EXISTS public.create_number_template_sequence();
    `);
  },
};
