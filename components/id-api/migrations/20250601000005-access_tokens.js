module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.access_tokens (
        "accessToken" varchar NOT NULL,
        "clientId" varchar NOT NULL,
        "userId" varchar(24) NOT NULL,
        expires timestamptz NOT NULL,
        "scope" _varchar DEFAULT ARRAY[]::character varying[]::character varying(255)[] NOT NULL,
        CONSTRAINT access_tokens_pk PRIMARY KEY ("accessToken"),
        CONSTRAINT access_tokens_clients_fk FOREIGN KEY ("clientId") REFERENCES public.clients("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT access_tokens_users_fk FOREIGN KEY ("userId") REFERENCES public.users("userId") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX access_tokens_expires_idx ON public.access_tokens USING btree (expires);
      CREATE INDEX access_tokens_user_id_idx ON public.access_tokens USING btree ("userId");
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.access_tokens;
    `);
  },
};
