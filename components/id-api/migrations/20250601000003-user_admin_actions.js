module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TYPE public."enum_delete_history_action_type" AS ENUM (
        'delete',
        'block',
        'unblock'
      );

      CREATE TABLE IF NOT EXISTS public.user_admin_actions (
        id uuid NOT NULL,
        user_id varchar(255) NOT NULL,
        "data" jsonb NOT NULL,
        created_by jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        action_type public."enum_delete_history_action_type" DEFAULT 'delete'::enum_delete_history_action_type NOT NULL,
        CONSTRAINT user_admin_actions_pkey PRIMARY KEY (id)
      );
      CREATE INDEX user_admin_actions_created_at ON public.user_admin_actions USING btree (created_at);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.user_admin_actions;
    `);
  },
};
