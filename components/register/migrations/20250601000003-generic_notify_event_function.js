module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.generic_notify_event() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
          BEGIN
              PERFORM pg_notify(
                  TG_ARGV[0],
                  json_build_object(
                      'table', TG_TABLE_NAME,
                      'id', NEW.id,
                      'action', TG_OP
                  )::text
              );
              RETURN NEW;
          END;
        $$;
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS public.generic_notify_event();
    `);
  },
}; 