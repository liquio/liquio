module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.refresh_tokens (
        "refreshToken" varchar NOT NULL,
        "clientId" varchar NOT NULL,
        "userId" varchar(24) NOT NULL,
        expires timestamptz NOT NULL,
        CONSTRAINT refresh_tokens_clients_fk FOREIGN KEY ("clientId") REFERENCES public.clients("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT refresh_tokens_users_fk FOREIGN KEY ("userId") REFERENCES public.users("userId") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT refresh_tokens_pk PRIMARY KEY ("refreshToken")
      );
      CREATE INDEX refresh_tokens_expires_idx ON public.refresh_tokens USING btree (expires);
      CREATE INDEX refresh_tokens_refresh_token_idx ON public.refresh_tokens USING btree ("refreshToken");
      CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree ("userId");
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.refresh_tokens;
    `);
  },
};
