module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.auth_codes (
        code varchar NOT NULL,
        "clientId" varchar NOT NULL,
        "userId" varchar(24) NOT NULL,
        expires timestamptz NOT NULL,
        "scope" _varchar DEFAULT ARRAY[]::character varying[]::character varying(255)[] NOT NULL,
        CONSTRAINT auth_codes_pk PRIMARY KEY (code),
        CONSTRAINT auth_codes_clients_fk FOREIGN KEY ("clientId") REFERENCES public.clients("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT auth_codes_users_fk FOREIGN KEY ("userId") REFERENCES public.users("userId") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX auth_codes_user_id ON public.auth_codes USING btree ("userId");
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.auth_codes;
    `);
  },
};
