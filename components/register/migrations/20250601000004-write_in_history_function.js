module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.write_in_history_function() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        DECLARE
            is_disable_history boolean;
            record_id_to_save uuid;
            register_id_to_save int;
            key_id_to_save int;
            operation_type enum_history_operation;
            data_to_save jsonb;
            created_by_to_save varchar(255);
            updated_by_to_save varchar(255);
            created_at_to_save timestamptz := NOW();
            updated_at_to_save timestamptz := NOW();
            person_to_save jsonb;
            meta_to_save jsonb;
        BEGIN
            SELECT (meta ->> 'isDisableHistory')::boolean INTO is_disable_history FROM keys WHERE id = OLD.key_id;
            IF is_disable_history IS TRUE THEN
                RETURN NULL;
            END IF;    
            
            CASE TG_OP
                WHEN 'INSERT' THEN
                    record_id_to_save := NEW.id;
                    register_id_to_save := NEW.register_id;
                    key_id_to_save := NEW.key_id;
                    operation_type := 'create';
                    data_to_save := to_jsonb(NEW);
                    created_by_to_save := NEW.created_by;
                    updated_by_to_save := NEW.updated_by;
                    person_to_save := NEW.meta->>'person';
                    meta_to_save := NEW.meta->>'historyMeta';
                WHEN 'UPDATE' THEN
                    record_id_to_save := NEW.id;
                    register_id_to_save := NEW.register_id;
                    key_id_to_save := NEW.key_id;
                    operation_type := 'update';
                    data_to_save := to_jsonb(NEW);
                    created_by_to_save := NEW.created_by;
                    updated_by_to_save := NEW.updated_by;
                    person_to_save := NEW.meta->>'person';
                    meta_to_save := NEW.meta->>'historyMeta';
                WHEN 'DELETE' THEN
                    record_id_to_save := OLD.id;
                    register_id_to_save := OLD.register_id;
                    key_id_to_save := OLD.key_id;
                    operation_type := 'delete';
                    data_to_save := to_jsonb(OLD);
                    created_by_to_save := OLD.created_by;
                    updated_by_to_save := OLD.updated_by;
                    person_to_save := OLD.meta->>'person';
                    meta_to_save := OLD.meta->>'historyMeta';
            END CASE;

            IF person_to_save is null THEN 
                person_to_save := '{"id": null, "name": null}';
            END IF;
            
            IF meta_to_save is null THEN 
                meta_to_save := '{}';
            END IF;

            INSERT INTO history (id, record_id, register_id, key_id, operation, data, created_by, updated_by, created_at, updated_at, person, meta)
                VALUES (gen_random_uuid (), record_id_to_save, register_id_to_save, key_id_to_save, operation_type, data_to_save, created_by_to_save, updated_by_to_save, created_at_to_save, updated_at_to_save, person_to_save, meta_to_save);
            
            RETURN NULL;
                
        END;
        $$;
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS public.write_in_history_function();
    `);
  },
}; 