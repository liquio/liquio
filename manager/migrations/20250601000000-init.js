module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create required extensions
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      
      -- Create epoch sequence for object ID generation
      CREATE SEQUENCE IF NOT EXISTS epoch_seq INCREMENT 1;
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Drop sequence
      DROP SEQUENCE IF EXISTS epoch_seq;
      
      -- Drop extensions (note: be careful with extensions in production)
      DROP EXTENSION IF EXISTS pg_trgm;
      DROP EXTENSION IF EXISTS pgcrypto;
    `);
  }
};
