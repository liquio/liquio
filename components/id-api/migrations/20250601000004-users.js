module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        "userId" varchar(24) DEFAULT generate_object_id() NOT NULL,
        email varchar(255) DEFAULT NULL::character varying NULL,
        "password" varchar(100) NULL,
        first_name varchar(100) NULL,
        last_name varchar(100) NULL,
        middle_name varchar(100) NULL,
        birthday date NULL,
        "avaUrl" varchar(100) NULL,
        status varchar(100) NULL,
        phone varchar(100) NULL,
        "valid" json DEFAULT '{"phone":false}'::json NULL,
        gender varchar(6) NULL,
        provider varchar(100) NULL,
        "createdAt" timestamptz DEFAULT now() NOT NULL,
        "updatedAt" timestamptz NULL,
        ipn varchar(255) DEFAULT NULL::character varying NULL,
        "role" varchar(255) DEFAULT 'individual'::character varying NULL,
        "useTwoFactorAuth" bool DEFAULT false NULL,
        edrpou varchar(255) DEFAULT NULL::character varying NULL,
        "isLegal" bool DEFAULT false NULL,
        "companyName" varchar(255) DEFAULT NULL::character varying NULL,
        "isIndividualEntrepreneur" bool DEFAULT false NULL,
        "legalEntityDateRegistration" date NULL,
        address varchar(255) NULL,
        "lockUserInfo" bool NULL,
        "userIdentificationType" varchar(255) DEFAULT 'unknown'::character varying NULL,
        passport_series varchar(255) DEFAULT NULL::character varying NULL,
        passport_number varchar(255) DEFAULT NULL::character varying NULL,
        passport_issue_date date NULL,
        passport_issued_by varchar(255) DEFAULT NULL::character varying NULL,
        id_card_number varchar(255) DEFAULT NULL::character varying NULL,
        id_card_issue_date date NULL,
        id_card_issued_by varchar(255) DEFAULT NULL::character varying NULL,
        "onboardingTaskId" varchar(255) DEFAULT NULL::character varying NULL,
        "needOnboarding" bool DEFAULT true NOT NULL,
        "addressStruct" json DEFAULT '{}'::json NOT NULL,
        "isActive" bool DEFAULT true NOT NULL,
        id_card_expiry_date date NULL,
        is_private_house bool NULL,
        foreigners_document_series varchar(255) DEFAULT NULL::character varying NULL,
        foreigners_document_number varchar(255) DEFAULT NULL::character varying NULL,
        foreigners_document_issue_date date NULL,
        foreigners_document_issued_by varchar(255) DEFAULT NULL::character varying NULL,
        foreigners_document_expire_date date NULL,
        foreigners_document_type json DEFAULT '{}'::json NOT NULL,
        "companyUnit" varchar(255) NULL,
        "2fa_type" varchar(255) NULL,
        CONSTRAINT users_pk PRIMARY KEY ("userId"),
        CONSTRAINT users_un_email UNIQUE (email),
        CONSTRAINT users_un_phone UNIQUE (phone)
      );
      CREATE UNIQUE INDEX "usersId_idx" ON public.users USING btree ("userId");
      CREATE INDEX users_created_at_idx ON public.users USING btree ("createdAt");
      CREATE INDEX users_email_gin_idx ON public.users USING gin (email gin_trgm_ops);
      CREATE INDEX users_email_lowercase_idx ON public.users USING btree (lower((email)::text));
      CREATE UNIQUE INDEX users_idx_ipn ON public.users USING btree (ipn);
      CREATE INDEX users_last_name_gin_idx ON public.users USING gin (last_name gin_trgm_ops);
      CREATE INDEX users_phone_gin_idx ON public.users USING gin (phone gin_trgm_ops);
      CREATE UNIQUE INDEX users_phone_idx ON public.users USING btree (phone);
    `);
  },
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.users;
    `);
  },
};
