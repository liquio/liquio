module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.clients (
        "clientId" VARCHAR NOT NULL,
        "redirectUri" VARCHAR[] NULL,
        requirements VARCHAR[] NULL,
        secret VARCHAR(255) NULL,
        need_secret BOOLEAN DEFAULT FALSE NOT NULL,
        grants VARCHAR[] DEFAULT ARRAY['authorization_code', 'refresh_token']::VARCHAR[] NULL,
        "scope" VARCHAR[] DEFAULT ARRAY[]::VARCHAR[] NOT NULL,
        client_name VARCHAR(255) DEFAULT 'Unnamed client' NOT NULL,
        need_scope_approve BOOLEAN DEFAULT TRUE NULL,
        CONSTRAINT clients_pkey PRIMARY KEY ("clientId")
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.dropTable('clients');
  }
};
