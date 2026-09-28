module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.user_sessions (
        sid varchar NOT NULL,
        expires date NOT NULL,
        "userId" varchar(24) NULL,
        "data" varchar(50000) NULL,
        CONSTRAINT user_sessions_pk PRIMARY KEY (sid),
        CONSTRAINT user_sessions_users_fk FOREIGN KEY ("userId") REFERENCES public.users("userId") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX user_sessions_expires ON public.user_sessions USING btree (expires);
      CREATE INDEX user_sessions_user_id ON public.user_sessions USING btree ("userId");
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.user_sessions;
    `);
  },
};
