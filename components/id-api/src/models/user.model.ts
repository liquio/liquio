import { BaseModel, DataTypes, Sequelize } from './base_model';

export interface UserAttributes {
  userId: string;
  email?: string;
  password?: string;
  gender?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  birthday?: string;
  address?: string;
  avaUrl?: string;
  status?: string;
  phone?: string;
  ipn?: string;
  edrpou?: string;
  isLegal?: boolean;
  isIndividualEntrepreneur?: boolean;
  companyName?: string;
  companyUnit?: string;
  legalEntityDateRegistration?: string;
  role?: string;
  useTwoFactorAuth?: boolean;
  twoFactorType?: 'phone' | 'totp';
  valid?: { phone: boolean; email: boolean };
  provider?: string;
  createdAt: Date;
  updatedAt?: Date;
  lockUserInfo?: boolean;
  userIdentificationType?: string;
  passport_series?: string;
  passport_number?: string;
  passport_issue_date?: string;
  passport_issued_by?: string;
  foreigners_document_series?: string;
  foreigners_document_number?: string;
  foreigners_document_issue_date?: string;
  foreigners_document_expire_date?: string;
  foreigners_document_issued_by?: string;
  foreigners_document_type?: string;
  id_card_number?: string;
  id_card_issue_date?: string;
  id_card_expiry_date?: string;
  id_card_issued_by?: string;
  onboardingTaskId?: string;
  needOnboarding?: boolean;
  addressStruct?: Record<string, any>;
  isActive?: boolean;
  is_private_house?: boolean;
}

export type UserCreationAttributes = Omit<UserAttributes, 'userId' | 'createdAt' | 'updatedAt'>;

export class UserModel extends BaseModel<UserAttributes, UserCreationAttributes> {
  constructor(sequelize: Sequelize) {
    super(sequelize);

    this.entity = this.sequelize.define(
      'users',
      {
        userId: {
          type: DataTypes.STRING(24),
          defaultValue: this.sequelize.literal('generate_object_id()'),
          allowNull: false,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        password: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        gender: {
          type: DataTypes.STRING(6),
          allowNull: true,
        },
        first_name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        last_name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        middle_name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        birthday: {
          type: DataTypes.DATEONLY,
          defaultValue: null,
          allowNull: true,
        },
        address: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        avaUrl: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        ipn: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        edrpou: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        isLegal: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: true,
        },
        isIndividualEntrepreneur: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: true,
        },
        companyName: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        companyUnit: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        legalEntityDateRegistration: {
          type: DataTypes.DATEONLY,
          defaultValue: null,
          allowNull: true,
        },
        role: {
          type: DataTypes.STRING,
          defaultValue: 'individual',
          allowNull: true,
        },
        useTwoFactorAuth: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: true,
        },
        twoFactorType: {
          field: '2fa_type',
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        valid: {
          type: DataTypes.JSON,
          defaultValue: { phone: false, email: false },
          allowNull: true,
        },
        provider: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: this.sequelize.literal('now()'),
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lockUserInfo: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        userIdentificationType: {
          type: DataTypes.STRING,
          defaultValue: 'unknown',
          allowNull: false,
        },
        passport_series: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        passport_number: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        passport_issue_date: {
          type: DataTypes.DATEONLY,
          defaultValue: null,
          allowNull: true,
        },
        passport_issued_by: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        foreigners_document_series: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        foreigners_document_number: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        foreigners_document_issue_date: {
          type: DataTypes.DATEONLY,
          defaultValue: null,
          allowNull: true,
        },
        foreigners_document_expire_date: {
          type: DataTypes.DATEONLY,
          defaultValue: null,
          allowNull: true,
        },
        foreigners_document_issued_by: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        foreigners_document_type: {
          type: DataTypes.JSON,
          defaultValue: {},
          allowNull: false,
        },
        id_card_number: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        id_card_issue_date: {
          type: DataTypes.DATEONLY,
          defaultValue: null,
          allowNull: true,
        },
        id_card_expiry_date: {
          type: DataTypes.DATEONLY,
          defaultValue: null,
          allowNull: true,
        },
        id_card_issued_by: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        onboardingTaskId: {
          type: DataTypes.STRING,
          defaultValue: null,
          allowNull: true,
        },
        needOnboarding: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        addressStruct: {
          type: DataTypes.JSON,
          defaultValue: {},
          allowNull: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        is_private_house: {
          type: DataTypes.BOOLEAN,
          defaultValue: null,
          allowNull: true,
        },
      },
      {
        tableName: 'users',
      },
    );
  }

  async init() {
    this.entity.hasMany(this.model('userServices'), {
      onDelete: 'cascade',
      foreignKey: 'userId',
    });
    this.entity.hasMany(this.model('userOldData'), {
      onDelete: 'cascade',
      foreignKey: 'userId',
    });
    this.entity.hasMany(this.model('clientUser'), {
      onDelete: 'cascade',
      foreignKey: 'userId',
    });
    this.entity.hasOne(this.model('userTotpSecret'), {
      onDelete: 'cascade',
      foreignKey: 'userId',
    });
  }
}
