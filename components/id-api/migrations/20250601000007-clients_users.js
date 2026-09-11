module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.clients_users (
        id serial4 NOT NULL,
        "clientId" varchar(255) NOT NULL,
        "userId" varchar(24) NOT NULL,
        "scope" _varchar NULL,
        CONSTRAINT clients_users_pkey PRIMARY KEY (id),
        CONSTRAINT "clients_users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients("clientId") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "clients_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users("userId") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.clients_users;
    `);
  },
};
