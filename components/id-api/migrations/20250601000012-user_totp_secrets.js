module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.user_totp_secrets (
        "userId" varchar(24) NOT NULL,
        secret varchar(255) NOT NULL,
        "createdAt" timestamptz DEFAULT now() NOT NULL,
        "updatedAt" timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT user_totp_secrets_pkey PRIMARY KEY ("userId"),
        CONSTRAINT "user_totp_secrets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users("userId")
      );
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.user_totp_secrets;
    `);
  },
};
