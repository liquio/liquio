module.exports = {
  async up(queryInterface) {
    return queryInterface.sequelize.query(`
      -- Create localization_languages table
      CREATE TABLE public.localization_languages (
          code character varying(5) NOT NULL,
          name jsonb NOT NULL,
          is_active boolean DEFAULT true NOT NULL,
          meta jsonb DEFAULT '{}'::jsonb NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create localization_texts table
      CREATE TABLE public.localization_texts (
          localization_language_code character varying(5) NOT NULL,
          key character varying(255) NOT NULL,
          value text NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create mass_messages_mailing table
      CREATE TABLE public.mass_messages_mailing (
          id uuid NOT NULL,
          initiator_id character varying(255),
          emails_list character varying(255)[],
          user_ids_list character varying(255)[],
          subject text,
          full_text text,
          response_by_emails json,
          response_by_user_ids json,
          is_finished boolean DEFAULT false NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Create number_template_sequence_1000001 sequence
      CREATE SEQUENCE public.number_template_sequence_1000001
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      -- Create number_templates table and its sequence
      CREATE SEQUENCE public.number_templates_id_seq
          AS integer
          START WITH 1
          INCREMENT BY 1
          NO MINVALUE
          NO MAXVALUE
          CACHE 1;

      CREATE TABLE public.number_templates (
          id integer NOT NULL,
          name character varying(255) NOT NULL,
          template character varying(255) NOT NULL,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Link sequence to number_templates table
      ALTER SEQUENCE public.number_templates_id_seq OWNED BY public.number_templates.id;
      ALTER TABLE ONLY public.number_templates ALTER COLUMN id SET DEFAULT nextval('public.number_templates_id_seq'::regclass);

      -- Create triggers for number_templates table
      CREATE TRIGGER create_number_template 
        AFTER INSERT
        ON public.number_templates 
        FOR EACH ROW 
        EXECUTE FUNCTION create_number_template_sequence();

      CREATE TRIGGER number_template_notify 
        AFTER INSERT OR DELETE OR UPDATE
        ON public.number_templates 
        FOR EACH ROW 
        EXECUTE FUNCTION generic_notify_event('number_template_row_change_notify');

      -- Add primary key constraint
      ALTER TABLE ONLY public.number_templates ADD CONSTRAINT number_templates_pkey PRIMARY KEY (id);

      -- Create payment_logs table
      CREATE TABLE public.payment_logs (
          id uuid NOT NULL,
          transaction_id character varying(255),
          payment_action public.enum_payment_logs_payment_action,
          data json DEFAULT '{}'::json,
          created_at timestamp with time zone NOT NULL,
          updated_at timestamp with time zone NOT NULL
      );

      -- Add primary key constraints for misc tables
      ALTER TABLE ONLY public.mass_messages_mailing ADD CONSTRAINT mass_messages_mailing_pkey PRIMARY KEY (id);
      ALTER TABLE ONLY public.payment_logs ADD CONSTRAINT payment_logs_pkey PRIMARY KEY (id);
    `);
  },

  async down(queryInterface) {
    return queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS create_number_template ON public.number_templates;
      DROP TRIGGER IF EXISTS number_template_notify ON public.number_templates;
      DROP TABLE IF EXISTS public.payment_logs;
      DROP TABLE IF EXISTS public.number_templates;
      DROP SEQUENCE IF EXISTS public.number_templates_id_seq;
      DROP SEQUENCE IF EXISTS public.number_template_sequence_1000001;
      DROP TABLE IF EXISTS public.mass_messages_mailing;
      DROP TABLE IF EXISTS public.localization_texts;
      DROP TABLE IF EXISTS public.localization_languages;
    `);
  }
};
