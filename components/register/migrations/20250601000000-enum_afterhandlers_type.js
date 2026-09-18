module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_afterhandlers_type') THEN
          CREATE TYPE public.enum_afterhandlers_type AS ENUM (
            'blockchain',
            'elastic',
            'plink'
          );
        END IF;
      END
      $$;
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS public.enum_afterhandlers_type;
    `);
  },
}; 