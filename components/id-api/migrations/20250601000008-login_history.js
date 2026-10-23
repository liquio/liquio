module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TYPE public."enum_login_history_action_type" AS ENUM (
        'login',
        'logout',
        'change_password'
      );
      CREATE TABLE IF NOT EXISTS public.login_history (
        id uuid NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        user_id varchar(255) NOT NULL,
        user_name varchar(255) NULL,
        ip _varchar DEFAULT ARRAY[]::character varying[]::character varying(255)[] NOT NULL,
        user_agent text NULL,
        client_id varchar(255) NOT NULL,
        client_name varchar(255) NULL,
        is_blocked bool DEFAULT false NOT NULL,
        action_type public."enum_login_history_action_type" DEFAULT 'login'::enum_login_history_action_type NOT NULL,
        CONSTRAINT login_history_pkey PRIMARY KEY (id),
        CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users("userId")
      );
      CREATE INDEX login_history_client_id ON public.login_history USING btree (client_id);
      CREATE INDEX login_history_client_name ON public.login_history USING btree (client_name);
      CREATE INDEX login_history_created_at ON public.login_history USING btree (created_at);
      CREATE INDEX login_history_id ON public.login_history USING btree (id);
      CREATE INDEX login_history_ip ON public.login_history USING btree (ip);
      CREATE INDEX login_history_user_id ON public.login_history USING btree (user_id);
      CREATE INDEX login_history_user_name ON public.login_history USING btree (user_name);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.login_history;
    `);
  },
};
