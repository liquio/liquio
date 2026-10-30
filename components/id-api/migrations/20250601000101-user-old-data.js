module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE public.user_old_data (
        id serial4 NOT NULL,
        "userId" varchar(24) NOT NULL,
        "oldPhone" varchar(255) NULL,
        "oldEmail" varchar(255) NULL,
        "createdAt" timestamptz NOT NULL,
        "updatedAt" timestamptz NOT NULL,
        CONSTRAINT user_old_data_pkey PRIMARY KEY (id),
        CONSTRAINT "user_old_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users("userId") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.user_old_data;
    `);
  },
};
