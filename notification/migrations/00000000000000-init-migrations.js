module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.query(`
      -- Data types.

      DO $$
      BEGIN
        BEGIN
          CREATE TYPE public."sms_queue_enum_status" AS ENUM (
	        'waiting',
	        'sended',
	        'rejected');
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Data type sms_queue_enum_status already exists';
        END;
      END $$;

      -- Create tables with indexes.

      CREATE TABLE IF NOT EXISTS public.authorize (
        authorize_id serial4 NOT NULL,
        login varchar(255) NOT NULL,
        "password" text NOT NULL,
        CONSTRAINT authorize_pkey PRIMARY KEY (authorize_id)
      );

      CREATE TABLE IF NOT EXISTS public.communications (
        communication_id serial4 NOT NULL,
        "name" varchar(255) NULL,
        "enable" bool NOT NULL DEFAULT true,
        CONSTRAINT communications_pkey PRIMARY KEY (communication_id)
      );

      CREATE TABLE IF NOT EXISTS public.configs (
        id serial4 NOT NULL,
        environment varchar NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        info json NOT NULL,
        CONSTRAINT configs_pkey PRIMARY KEY (id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS configs_environment_uindex ON public.configs USING btree (environment);

      CREATE TABLE IF NOT EXISTS public.events (
        event_id serial4 NOT NULL,
        "name" varchar(255) NULL,
        description text NULL,
        out_event_id int4 NULL,
        "enable" bool NOT NULL DEFAULT true,
        private bool NOT NULL DEFAULT false,
        CONSTRAINT events_pkey PRIMARY KEY (event_id)
      );
      CREATE INDEX IF NOT EXISTS events_name ON public.events USING btree (name);
      CREATE INDEX IF NOT EXISTS events_out_event_id ON public.events USING btree (out_event_id);

      CREATE TABLE IF NOT EXISTS public.important_messages (
        id serial4 NOT NULL,
        user_message_id int4 NOT NULL,
        message_id int4 NOT NULL,
        is_active bool NOT NULL DEFAULT true,
        allow_hide bool NOT NULL DEFAULT true,
        expired_at timestamptz NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        CONSTRAINT important_messages_pkey PRIMARY KEY (id)
      );
      CREATE INDEX IF NOT EXISTS important_messages_id ON public.important_messages USING btree (id);
      CREATE INDEX IF NOT EXISTS important_messages_message_id ON public.important_messages USING btree (message_id);
      CREATE INDEX IF NOT EXISTS important_messages_user_message_id ON public.important_messages USING btree (user_message_id);

      CREATE TABLE IF NOT EXISTS public.incomming_messages (
        message_id serial4 NOT NULL,
        list_user_id _varchar NULL,
        list_place_id _varchar NULL,
        list_phone _varchar NULL,
        list_email _varchar NULL,
        event_id int4 NULL,
        short_message varchar(160) NULL,
        short_message_translit varchar(160) NULL,
        title_message varchar NULL,
        full_message text NULL,
        date_create timestamptz NOT NULL DEFAULT now(),
        workflow_id int4 NULL,
        user_ipn varchar(255) NULL DEFAULT NULL::character varying,
        address varchar(255) NULL DEFAULT NULL::character varying,
        medium_message text NULL,
        processing_id varchar(255) NULL DEFAULT NULL::character varying,
        message_crypt_type_id int4 NULL,
        is_encrypted bool NOT NULL DEFAULT false,
        decrypted_base64 text NULL,
        client_id varchar(255) NULL,
        sender varchar(255) NULL,
        meta json NOT NULL DEFAULT '{}'::json,
        CONSTRAINT incomming_messages_pkey PRIMARY KEY (message_id)
      );
      CREATE INDEX IF NOT EXISTS incomming_messages_client_id ON public.incomming_messages USING btree (client_id);
      CREATE INDEX IF NOT EXISTS incomming_messages_date_create ON public.incomming_messages USING btree (date_create);
      CREATE INDEX IF NOT EXISTS incomming_messages_event_id ON public.incomming_messages USING btree (event_id);
      CREATE INDEX IF NOT EXISTS incomming_messages_is_encrypted ON public.incomming_messages USING btree (is_encrypted);
      CREATE INDEX IF NOT EXISTS incomming_messages_list_user_id ON public.incomming_messages USING btree (list_user_id);
      CREATE INDEX IF NOT EXISTS incomming_messages_processing_id ON public.incomming_messages USING btree (processing_id);
      CREATE INDEX IF NOT EXISTS incomming_messages_sender ON public.incomming_messages USING btree (sender);
      CREATE INDEX IF NOT EXISTS incomming_messages_user_ipn ON public.incomming_messages USING btree (user_ipn);
      CREATE INDEX IF NOT EXISTS incomming_messages_workflow_id ON public.incomming_messages USING btree (workflow_id);

      CREATE TABLE IF NOT EXISTS public.mail_queue (
        mail_id serial4 NOT NULL,
        message_id int4 NOT NULL,
        email varchar(255) NOT NULL,
        CONSTRAINT mail_queue_pkey PRIMARY KEY (mail_id)
      );

      CREATE TABLE IF NOT EXISTS public.message_crypt_types (
        id serial4 NOT NULL,
        "name" varchar(255) NOT NULL,
        rule_to_show text NOT NULL DEFAULT '(decryptedBase64) => Buffer.from(decryptedBase64, ''base64'').toString(''utf8'');'::text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT message_crypt_types_pkey PRIMARY KEY (id)
      );

      CREATE TABLE IF NOT EXISTS public.settings (
        setting_id serial4 NOT NULL,
        event_id int4 NOT NULL,
        communication_id int4 NOT NULL,
        "enable" bool NOT NULL DEFAULT true,
        CONSTRAINT settings_pkey PRIMARY KEY (setting_id)
      );

      CREATE TABLE IF NOT EXISTS public.sms_queue (
        sms_id serial4 NOT NULL,
        message_id int4 NOT NULL,
        communication_id int4 NULL,
        phone varchar(255) NOT NULL,
        forced bool NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        status public."sms_queue_enum_status" NOT NULL DEFAULT 'waiting'::sms_queue_enum_status,
        CONSTRAINT sms_queue_pkey PRIMARY KEY (sms_id)
      );

      CREATE TABLE IF NOT EXISTS public.templates (
        template_id serial4 NOT NULL,
        "type" varchar(255) NOT NULL,
        "text" text NOT NULL,
        title text NOT NULL,
        CONSTRAINT templates_pkey PRIMARY KEY (template_id)
      );

      CREATE TABLE IF NOT EXISTS public.user_subscribes (
        subscribe_id serial4 NOT NULL,
        setting_id int4 NOT NULL,
        user_id varchar(255) NOT NULL,
        CONSTRAINT user_subscribes_pkey PRIMARY KEY (subscribe_id)
      );

      CREATE TABLE IF NOT EXISTS public.users_messages (
        user_message_id serial4 NOT NULL,
        user_id varchar(255) NOT NULL,
        message_id int4 NOT NULL,
        event_id int4 NULL,
        is_read int4 NULL,
        show_to_all bool NOT NULL DEFAULT false,
        CONSTRAINT users_messages_pkey PRIMARY KEY (user_message_id)
      );
      CREATE INDEX IF NOT EXISTS users_messages_event_id ON public.users_messages USING btree (event_id);
      CREATE INDEX IF NOT EXISTS users_messages_is_read ON public.users_messages USING btree (is_read);
      CREATE INDEX IF NOT EXISTS users_messages_message_id ON public.users_messages USING btree (message_id);
      CREATE INDEX IF NOT EXISTS users_messages_user_id ON public.users_messages USING btree (user_id);

      -- Create foreign keys.

      DO $$
      BEGIN
        BEGIN
          ALTER TABLE public.important_messages ADD CONSTRAINT important_messages_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.incomming_messages(message_id);
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint important_messages_message_id_fkey already exists';
        END;
        BEGIN
          ALTER TABLE public.important_messages ADD CONSTRAINT important_messages_user_message_id_fkey FOREIGN KEY (user_message_id) REFERENCES public.users_messages(user_message_id);
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint important_messages_user_message_id_fkey already exists';
        END;
      
        BEGIN
          ALTER TABLE public.incomming_messages ADD CONSTRAINT incomming_messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint incomming_messages_event_id_fkey already exists';
        END;
        BEGIN
          ALTER TABLE public.incomming_messages ADD CONSTRAINT incomming_messages_message_crypt_type_id_fkey FOREIGN KEY (message_crypt_type_id) REFERENCES public.message_crypt_types(id);
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint incomming_messages_message_crypt_type_id_fkey already exists';
        END;
        BEGIN
          ALTER TABLE public.mail_queue ADD CONSTRAINT mail_queue_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.incomming_messages(message_id);
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint mail_queue_message_id_fkey already exists';
        END;
      
        BEGIN
          ALTER TABLE public.settings ADD CONSTRAINT settings_communication_id_fkey FOREIGN KEY (communication_id) REFERENCES public.communications(communication_id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint settings_communication_id_fkey already exists';
        END;
        BEGIN
          ALTER TABLE public.settings ADD CONSTRAINT settings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint settings_event_id_fkey already exists';
        END;
      
        BEGIN
          ALTER TABLE public.sms_queue ADD CONSTRAINT sms_queue_communication_id_fkey FOREIGN KEY (communication_id) REFERENCES public.communications(communication_id);
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint sms_queue_communication_id_fkey already exists';
        END;
        BEGIN
          ALTER TABLE public.sms_queue ADD CONSTRAINT sms_queue_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.incomming_messages(message_id);
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint sms_queue_message_id_fkey already exists';
        END;
      
        BEGIN
          ALTER TABLE public.user_subscribes ADD CONSTRAINT user_subscribes_setting_id_fkey FOREIGN KEY (setting_id) REFERENCES public.settings(setting_id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint user_subscribes_setting_id_fkey already exists';
        END;
      
        BEGIN
          ALTER TABLE public.users_messages ADD CONSTRAINT users_messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint users_messages_event_id_fkey already exists';
        END;
        BEGIN
          ALTER TABLE public.users_messages ADD CONSTRAINT users_messages_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.incomming_messages(message_id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN RAISE NOTICE 'Table constraint users_messages_message_id_fkey already exists';
        END;
      END $$;
    `);
  },

  async down(queryInterface, _Sequelize) {
  }
};
