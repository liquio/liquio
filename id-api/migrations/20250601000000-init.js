module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE SEQUENCE IF NOT EXISTS epoch_seq INCREMENT 1;
      CREATE OR REPLACE FUNCTION public.generate_object_id()
      RETURNS character varying
      LANGUAGE plpgsql
      AS $function$
      DECLARE
        time_component bigint;
        epoch_seq int;
        machine_id text := encode(gen_random_bytes(3), 'hex');
        process_id bigint;
        seq_id text := encode(gen_random_bytes(3), 'hex');
        result varchar := '';
      BEGIN
        SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp())) INTO time_component;
        SELECT nextval('epoch_seq') INTO epoch_seq;
        SELECT pg_backend_pid() INTO process_id;

        result := result || lpad(to_hex(time_component), 8, '0');
        result := result || machine_id;
        result := result || lpad(to_hex(process_id), 3, '0');
        result := result || seq_id;
        result := result || lpad(to_hex(epoch_seq % 16), 1, '0');

        RETURN result;
      END;
      $function$;
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS public.generate_object_id();
      DROP EXTENSION IF EXISTS pg_trgm;
    `);
  }
};