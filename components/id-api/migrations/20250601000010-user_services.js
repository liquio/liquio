module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.user_services (
        id serial4 NOT NULL,
        "userId" varchar(24) NULL,
        provider varchar NULL,
        provider_id varchar NULL,
        "data" json NULL,
        CONSTRAINT user_services_pk PRIMARY KEY (id),
        CONSTRAINT user_services_users_fk FOREIGN KEY ("userId") REFERENCES public.users("userId") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX idx_provider_id ON public.user_services USING btree (provider_id);
      CREATE INDEX user_services_user_id ON public.user_services USING btree ("userId");
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.user_services;
    `);
  },
};
