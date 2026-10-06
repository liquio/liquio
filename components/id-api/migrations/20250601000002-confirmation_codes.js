module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.confirmation_codes (
        id serial4 NOT NULL,
        phone varchar NULL,
        email varchar NULL,
        code varchar(100) NULL,
        counter int4 DEFAULT 0 NOT NULL,
        "expiresIn" timestamptz DEFAULT now() + '01:00:00'::interval NOT NULL,
        CONSTRAINT confirmation_codes_pk PRIMARY KEY (id)
      );
      CREATE INDEX confirmation_codes_code_idx ON public.confirmation_codes USING btree (code);
      CREATE INDEX confirmation_codes_counter ON public.confirmation_codes USING btree (counter);
      CREATE INDEX confirmation_codes_email_idx ON public.confirmation_codes USING btree (email);
      CREATE INDEX "confirmation_codes_expiresIn_idx" ON public.confirmation_codes USING btree ("expiresIn");
      CREATE INDEX confirmation_codes_phone_idx ON public.confirmation_codes USING btree (phone);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.confirmation_codes;
    `);
  }
};